import Foundation
import UIKit
import UserNotifications
import WebKit

/// Native "每日經文推播" for the App Store wrapper.
///
/// WKWebView has no PushManager, so the web app's Web Push path is dead
/// inside this shell. The web push modal posts into this bridge
/// (`window.webkit.messageHandlers.dailyVersePush`) and we deliver the
/// daily verse via **APNs remote push** (primary): the device token is
/// uploaded to the PartyKit backend and the same hourly GitHub Actions
/// cron that sends Web Push also sends through Apple's push service —
/// so the verse text is always same-day fresh and arrives even if the
/// user hasn't opened the app in months.
///
/// If APNs registration fails (no network, entitlement missing in a dev
/// build, etc.) we fall back to **local notifications**: prefetch the
/// next 14 days and queue a 7am nudge per day, sliding the window
/// forward on every foreground.
///
/// Tapping either kind of notification deep-links into
/// `/?listenDaily=<date>&version=<v>` — the same URL the Web Push cron
/// sends, so in-app handling is shared across all three transports.
///
/// Message protocol (web → native):
///   { action: "subscribe", playerName, email, version: "cuv", hour: 7 }
///   { action: "unsubscribe" }
///   { action: "status" }
/// Reply (native → web): window.__nativeDailyPushCallback({ status, transport })
/// where status ∈ "subscribed" | "idle" | "denied",
/// transport ∈ "apns" | "local" (subscribe replies only).
final class DailyVersePushBridge: NSObject, WKScriptMessageHandler {
    // Settable AFTER init — same registration-order constraint as the
    // sign-in bridges (see GoogleSignInBridge.webView for the why).
    weak var webView: WKWebView?

    // MARK: WKScriptMessageHandler
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "dailyVersePush",
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "subscribe":
            let playerName = (body["playerName"] as? String) ?? "Anonymous"
            let email = (body["email"] as? String) ?? ""
            let version = (body["version"] as? String) ?? "cuv"
            let hour = (body["hour"] as? Int) ?? 7
            Task { await self.subscribe(playerName: playerName, email: email, version: version, hour: hour) }
        case "unsubscribe":
            Task { await self.unsubscribe() }
        case "status":
            Task { await self.reportStatus() }
        default:
            break
        }
    }

    // MARK: Actions
    private func subscribe(playerName: String, email: String, version: String, hour: Int) async {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        guard granted else {
            reply(["status": "denied"])
            return
        }

        let defaults = UserDefaults.standard
        defaults.set(true, forKey: DailyVersePush.Keys.enabled)
        defaults.set(playerName, forKey: DailyVersePush.Keys.playerName)
        defaults.set(email, forKey: DailyVersePush.Keys.email)
        defaults.set(version, forKey: DailyVersePush.Keys.version)
        defaults.set(hour, forKey: DailyVersePush.Keys.hour)

        // APNs first: server-sent pushes carry the actual verse text and
        // keep working however long the app stays closed.
        if let token = await APNsRegistrar.shared.requestToken(),
           await DailyVersePush.uploadToken(token) {
            defaults.set("apns", forKey: DailyVersePush.Keys.mode)
            defaults.set(token, forKey: DailyVersePush.Keys.token)
            // Never double-notify: remote is live, so clear any local queue.
            await DailyVerseScheduler.cancelAll()
            reply(["status": "subscribed", "transport": "apns"])
            return
        }

        // Fallback: schedule locally so the user still gets the nudge.
        defaults.set("local", forKey: DailyVersePush.Keys.mode)
        await DailyVerseScheduler.reschedule()
        reply(["status": "subscribed", "transport": "local"])
    }

    private func unsubscribe() async {
        let defaults = UserDefaults.standard
        defaults.set(false, forKey: DailyVersePush.Keys.enabled)
        if let token = defaults.string(forKey: DailyVersePush.Keys.token) {
            await DailyVersePush.deleteToken(token)
            defaults.removeObject(forKey: DailyVersePush.Keys.token)
        }
        await DailyVerseScheduler.cancelAll()
        reply(["status": "idle"])
    }

    private func reportStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        let enabled = UserDefaults.standard.bool(forKey: DailyVersePush.Keys.enabled)
        let status: String
        if settings.authorizationStatus == .denied {
            status = "denied"
        } else if enabled && settings.authorizationStatus == .authorized {
            status = "subscribed"
        } else {
            status = "idle"
        }
        reply(["status": status])
    }

    private func reply(_ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(
                "window.__nativeDailyPushCallback && window.__nativeDailyPushCallback(\(json));",
                completionHandler: nil
            )
        }
    }
}

/// Shared state + PartyKit sync for the native daily push.
enum DailyVersePush {
    enum Keys {
        static let enabled = "dailyVersePush.enabled"
        static let mode = "dailyVersePush.mode"          // "apns" | "local"
        static let token = "dailyVersePush.token"        // last uploaded APNs token
        static let playerName = "dailyVersePush.playerName"
        static let email = "dailyVersePush.email"
        static let version = "dailyVersePush.version"
        static let hour = "dailyVersePush.hour"
    }

    static let partyBase = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db"

    /// Called from the AppDelegate whenever Apple hands us a device token
    /// (first registration AND every silent rotation on later launches).
    static func handleDeviceToken(_ data: Data) {
        let token = data.map { String(format: "%02x", $0) }.joined()
        Task { await APNsRegistrar.shared.resolve(with: token) }

        // Token rotation: keep the server row fresh without user action.
        let defaults = UserDefaults.standard
        if defaults.bool(forKey: Keys.enabled),
           defaults.string(forKey: Keys.mode) == "apns" {
            Task {
                if await uploadToken(token) {
                    defaults.set(token, forKey: Keys.token)
                }
            }
        }
    }

    static func handleRegistrationFailure(_ error: Error) {
        Task { await APNsRegistrar.shared.resolve(with: nil) }
    }

    /// Foreground hook — called from the App on every scene activation.
    static func refreshOnActive() {
        let defaults = UserDefaults.standard
        guard defaults.bool(forKey: Keys.enabled) else { return }
        switch defaults.string(forKey: Keys.mode) {
        case "apns":
            // Re-register so a rotated token gets re-uploaded via
            // handleDeviceToken. Cheap no-op when the token is unchanged.
            DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
        default:
            // Local mode: slide the 14-day window forward, and opportunistically
            // retry APNs (e.g. first subscribe happened offline).
            Task {
                if let token = await APNsRegistrar.shared.requestToken(),
                   await uploadToken(token) {
                    defaults.set("apns", forKey: Keys.mode)
                    defaults.set(token, forKey: Keys.token)
                    await DailyVerseScheduler.cancelAll()
                } else {
                    await DailyVerseScheduler.reschedule()
                }
            }
        }
    }

    static func uploadToken(_ token: String) async -> Bool {
        let defaults = UserDefaults.standard
        let payload: [String: Any] = [
            "playerName": defaults.string(forKey: Keys.playerName) ?? "Anonymous",
            "email": defaults.string(forKey: Keys.email) ?? "",
            "token": token,
            "timezone": TimeZone.current.identifier,
            "version": defaults.string(forKey: Keys.version) ?? "cuv",
            "hour": {
                let h = defaults.integer(forKey: Keys.hour)
                return (1...23).contains(h) ? h : 7
            }()
        ]
        return await post(path: "/save-apns-token", payload: payload)
    }

    static func deleteToken(_ token: String) async {
        _ = await post(path: "/delete-apns-token", payload: ["token": token])
    }

    private static func post(path: String, payload: [String: Any]) async -> Bool {
        guard let url = URL(string: partyBase + path),
              let body = try? JSONSerialization.data(withJSONObject: payload) else { return false }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        guard let (_, response) = try? await URLSession.shared.data(for: request) else { return false }
        return (response as? HTTPURLResponse)?.statusCode == 200
    }
}

/// Bridges the callback-style `registerForRemoteNotifications` API into
/// async/await. One registration attempt at a time; a 10s timeout keeps
/// the subscribe flow from hanging when Apple is unreachable.
@MainActor
final class APNsRegistrar {
    static let shared = APNsRegistrar()
    private var continuations: [CheckedContinuation<String?, Never>] = []

    func requestToken() async -> String? {
        await withCheckedContinuation { continuation in
            continuations.append(continuation)
            UIApplication.shared.registerForRemoteNotifications()
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                Task { await self?.resolve(with: nil) }
            }
        }
    }

    /// Resumes all waiters exactly once; later calls are no-ops because
    /// the list is already drained.
    func resolve(with token: String?) {
        let waiting = continuations
        continuations = []
        waiting.forEach { $0.resume(returning: token) }
    }
}

/// Local-notification fallback: fetches upcoming daily verses and queues
/// one 7am notification per day for the next two weeks. Only active when
/// APNs registration isn't available (see DailyVersePush.refreshOnActive).
enum DailyVerseScheduler {
    static let daysAhead = 14
    private static let idPrefix = "dailyverse-"

    static func cancelAll() async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests()
        let ours = pending.map(\.identifier).filter { $0.hasPrefix(idPrefix) }
        center.removePendingNotificationRequests(withIdentifiers: ours)
    }

    static func reschedule() async {
        let defaults = UserDefaults.standard
        let version = defaults.string(forKey: DailyVersePush.Keys.version) ?? "cuv"
        let storedHour = defaults.integer(forKey: DailyVersePush.Keys.hour)
        let hour = (1...23).contains(storedHour) ? storedHour : 7

        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized else { return }

        await cancelAll()

        let calendar = Calendar.current
        let now = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = calendar.timeZone
        // The API date param is interpreted as a plain calendar date, so
        // format in the device's local zone — matching the web app's
        // formatLocalDate().

        for offset in 0..<daysAhead {
            guard let day = calendar.date(byAdding: .day, value: offset, to: now) else { continue }

            var fireComponents = calendar.dateComponents([.year, .month, .day], from: day)
            fireComponents.hour = hour
            fireComponents.minute = 0
            // Skip today if the fire time already passed — a non-repeating
            // calendar trigger in the past would either fire instantly or
            // never, depending on the OS version. Neither is what we want.
            guard let fireDate = calendar.date(from: fireComponents), fireDate > now else { continue }

            let dateString = formatter.string(from: day)
            let verse = await fetchVerse(date: dateString, version: version)

            let content = UNMutableNotificationContent()
            if let verse {
                content.title = "🌧️ \(verse.reference)"
                content.body = verse.text.count > 200 ? String(verse.text.prefix(200)) + "…" : verse.text
            } else {
                // dailyverses.net may not have published that far ahead —
                // still nudge; the deep link resolves the verse on open.
                content.title = "🌧️ 今日經文 · Daily Verse"
                content.body = isChinese(version)
                    ? "點開聆聽今天的經文"
                    : "Tap to listen to today's verse"
            }
            content.sound = .default
            content.threadIdentifier = "dailyverse"
            var urlComponents = URLComponents(string: "https://www.verserain.com/")!
            urlComponents.queryItems = [
                URLQueryItem(name: "listenDaily", value: dateString),
                URLQueryItem(name: "version", value: version)
            ]
            content.userInfo = ["url": urlComponents.url?.absoluteString ?? "https://www.verserain.com/"]

            let trigger = UNCalendarNotificationTrigger(dateMatching: fireComponents, repeats: false)
            let request = UNNotificationRequest(
                identifier: idPrefix + dateString,
                content: content,
                trigger: trigger
            )
            try? await center.add(request)
        }
    }

    private struct Verse {
        let reference: String
        let text: String
    }

    private static func fetchVerse(date: String, version: String) async -> Verse? {
        var components = URLComponents(string: "https://www.verserain.com/api/daily-verse")!
        components.queryItems = [
            URLQueryItem(name: "date", value: date),
            URLQueryItem(name: "version", value: version)
        ]
        guard let url = components.url else { return nil }
        guard let (data, response) = try? await URLSession.shared.data(from: url),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let reference = json["reference"] as? String,
              let text = json["text"] as? String,
              !reference.isEmpty, !text.isEmpty else { return nil }
        // Only trust the content when the API confirms an exact match for
        // the requested date; otherwise fall back to the generic nudge so
        // we never notify yesterday's verse as today's.
        if let exact = json["exact"] as? Bool, !exact { return nil }
        return Verse(reference: reference, text: text)
    }

    private static func isChinese(_ version: String) -> Bool {
        ["cuv", "cuvs", "zh"].contains(version.lowercased())
    }
}

/// Routes notification taps back into the WKWebView and lets banners show
/// while the app is foregrounded. Registered as the
/// UNUserNotificationCenter delegate at app launch. Works for both APNs
/// and local notifications — both carry a top-level "url" in userInfo.
final class DailyVerseNotificationRouter: NSObject, UNUserNotificationCenterDelegate {
    static let shared = DailyVerseNotificationRouter()
    var onOpenURL: ((URL) -> Void)?

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        if let urlString = response.notification.request.content.userInfo["url"] as? String,
           let url = URL(string: urlString) {
            DispatchQueue.main.async { [weak self] in self?.onOpenURL?(url) }
        }
        completionHandler()
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }
}
