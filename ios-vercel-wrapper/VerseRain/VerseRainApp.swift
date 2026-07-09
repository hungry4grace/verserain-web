import SwiftUI
import UIKit
import UserNotifications

/// Minimal UIKit delegate — SwiftUI has no native hook for the APNs
/// device-token callbacks, so we adapt one in just for those.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        DailyVersePush.handleDeviceToken(deviceToken)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        DailyVersePush.handleRegistrationFailure(error)
    }
}

@main
struct VerseRainApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var webViewModel = WebViewModel()
    @Environment(\.scenePhase) private var scenePhase

    init() {
        // Route daily-verse notification taps + foreground banners.
        UNUserNotificationCenter.current().delegate = DailyVerseNotificationRouter.shared
    }

    var body: some Scene {
        WindowGroup {
            ContentView(model: webViewModel)
                .onOpenURL { url in
                    webViewModel.load(DeepLinkRouter.webURL(for: url))
                }
                .onAppear {
                    DailyVerseNotificationRouter.shared.onOpenURL = { url in
                        webViewModel.load(DeepLinkRouter.webURL(for: url))
                    }
                }
        }
        .onChange(of: scenePhase) { phase in
            // APNs mode: re-register so token rotations get re-uploaded.
            // Local mode: slide the 14-day notification window forward.
            if phase == .active {
                DailyVersePush.refreshOnActive()
            }
        }
    }
}

struct ContentView: View {
    @ObservedObject var model: WebViewModel

    var body: some View {
        WebView(model: model)
            .ignoresSafeArea()
    }
}
