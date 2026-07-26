import SwiftUI
import UIKit
import WebKit

@MainActor
final class WebViewModel: ObservableObject {
    // The `?iosApp=` query lets verserain.com gate native-only behaviour.
    // Bump alongside the app's MARKETING_VERSION so the web side can detect
    // capability changes (e.g. NSCameraUsageDescription was added in 3.7.0
    // — the QR scan UI is hidden in earlier builds).
    static let homeURL = URL(string: "https://www.verserain.com/?iosApp=3.17.0")!

    @Published private(set) var url: URL = homeURL
    weak var webView: WKWebView?

    func load(_ nextURL: URL) {
        url = nextURL

        guard let webView else {
            return
        }

        if webView.url?.absoluteString != nextURL.absoluteString {
            webView.load(URLRequest(url: nextURL))
        }
    }
}

struct WebView: UIViewRepresentable {
    @ObservedObject var model: WebViewModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.websiteDataStore = .default()

        // CRITICAL ORDERING:
        // WKWebViewConfiguration is captured by WKWebView at init and any
        // subsequent mutations to the original config object are ignored
        // (Apple docs: "WKWebViewConfiguration is consulted only during web
        // view initialization"). iOS 17+ enforces this strictly — earlier
        // builds were lenient, which is why this used to "just work" and
        // silently broke after the user's OS upgrade. The script message
        // handlers MUST be registered on userContentController BEFORE
        // creating the WKWebView, otherwise `window.webkit.messageHandlers
        // .googleSignIn` / `appleSignIn` are never bound and the web's
        // OAuth buttons postMessage into the void.
        //
        // Bridges are initialised without a webView; we set their webView
        // property after `WKWebView(...)` returns (they only need it to
        // evaluate the callback JS).
        let googleBridge = GoogleSignInBridge()
        configuration.userContentController.add(googleBridge, name: "googleSignIn")

        let appleBridge = AppleSignInBridge()
        configuration.userContentController.add(appleBridge, name: "appleSignIn")

        let dailyPushBridge = DailyVersePushBridge()
        configuration.userContentController.add(dailyPushBridge, name: "dailyVersePush")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        // Wire each bridge to the now-created webView for callback JS, and
        // retain the bridges on the coordinator so WKScriptMessageHandler
        // doesn't get deallocated.
        googleBridge.webView = webView
        context.coordinator.googleBridge = googleBridge

        appleBridge.webView = webView
        context.coordinator.appleBridge = appleBridge

        dailyPushBridge.webView = webView
        context.coordinator.dailyPushBridge = dailyPushBridge

        model.webView = webView
        webView.load(URLRequest(url: model.url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url?.absoluteString != model.url.absoluteString && !webView.isLoading {
            webView.load(URLRequest(url: model.url))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private let allowedHosts: Set<String> = [
            "www.verserain.com",
            "verserain.com",
            "verserain-web.vercel.app"
        ]

        private weak var model: WebViewModel?

        // Strong reference; required to keep the WKScriptMessageHandler alive.
        var googleBridge: GoogleSignInBridge?
        var appleBridge: AppleSignInBridge?
        var dailyPushBridge: DailyVersePushBridge?

        init(model: WebViewModel) {
            self.model = model
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            if url.scheme == "verserain" {
                Task { @MainActor in
                    self.model?.load(DeepLinkRouter.webURL(for: url))
                }
                decisionHandler(.cancel)
                return
            }

            guard url.scheme == "http" || url.scheme == "https" else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            if navigationAction.navigationType == .linkActivated,
               let host = url.host,
               !allowedHosts.contains(host) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
            }

            return nil
        }

        // MARK: - JavaScript dialog panels
        // WKWebView does NOT render window.alert / confirm / prompt unless the
        // UIDelegate implements these. Without them confirm() silently returns
        // false, which made destructive buttons (刪除題庫) look dead in the App.

        private func presentAlert(_ alert: UIAlertController, over webView: WKWebView) {
            guard var top = webView.window?.rootViewController else { return }
            while let presented = top.presentedViewController { top = presented }
            top.present(alert, animated: true)
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptAlertPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping () -> Void
        ) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            presentAlert(alert, over: webView)
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptConfirmPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping (Bool) -> Void
        ) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            presentAlert(alert, over: webView)
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptTextInputPanelWithPrompt prompt: String,
            defaultText: String?,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping (String?) -> Void
        ) {
            let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            alert.addTextField { $0.text = defaultText }
            alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(nil) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak alert] _ in
                completionHandler(alert?.textFields?.first?.text ?? "")
            })
            presentAlert(alert, over: webView)
        }
    }
}
