import SwiftUI
import UIKit
import WebKit

@MainActor
final class WebViewModel: ObservableObject {
    // The `?iosApp=` query lets verserain.com gate native-only behaviour.
    // Bump alongside the app's MARKETING_VERSION so the web side can detect
    // capability changes (e.g. NSCameraUsageDescription was added in 3.7.0
    // — the QR scan UI is hidden in earlier builds).
    static let homeURL = URL(string: "https://www.verserain.com/?iosApp=3.7.0")!

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

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        // Wire the native Google sign-in bridge so the web app's
        // "Continue with Google" button can hand the OAuth flow over to a
        // system Safari window via ASWebAuthenticationSession. Google blocks
        // OAuth in embedded WebViews, so this hand-off is required for the
        // web button to actually log a user in from inside the app.
        let googleBridge = GoogleSignInBridge(webView: webView)
        configuration.userContentController.add(googleBridge, name: "googleSignIn")
        context.coordinator.googleBridge = googleBridge

        // Native Sign in with Apple — required by App Store guideline 4.8
        // alongside any third-party login. Uses ASAuthorizationAppleIDProvider
        // (no Services ID needed; the iOS Bundle ID is the audience).
        let appleBridge = AppleSignInBridge(webView: webView)
        configuration.userContentController.add(appleBridge, name: "appleSignIn")
        context.coordinator.appleBridge = appleBridge

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
    }
}
