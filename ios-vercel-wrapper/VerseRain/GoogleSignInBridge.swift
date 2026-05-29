import Foundation
import AuthenticationServices
import WebKit

/// Bridges the web app's "Sign in with Google" button to a native
/// `ASWebAuthenticationSession`. Google blocks OAuth inside embedded
/// WKWebViews, so the web button posts a message to JS handler
/// `googleSignIn`; we open the OS Safari-backed auth window, harvest the
/// access_token from the callback URL fragment, and feed it back to the
/// web app via `window.__verseRainNativeOAuth('google', '<token>')`.
final class GoogleSignInBridge: NSObject, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding {
    // Same OAuth Client ID as the web frontend (src/oauthConfig.js).
    static let clientId = "761845973381-2eqaapf2m64voq5gvod1vo5p48o1niua.apps.googleusercontent.com"

    // Redirect URI must be registered in Google Cloud Console for the same
    // OAuth client. For native iOS the convention is reverse-DNS scheme:
    //   com.googleusercontent.apps.<numeric prefix>
    static let redirectScheme = "com.googleusercontent.apps.761845973381-2eqaapf2m64voq5gvod1vo5p48o1niua"
    static let redirectURI = "\(redirectScheme):/oauth2redirect/google"

    private weak var webView: WKWebView?
    private var activeSession: ASWebAuthenticationSession?

    init(webView: WKWebView) {
        self.webView = webView
        super.init()
    }

    // MARK: WKScriptMessageHandler
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "googleSignIn" else { return }
        Task { @MainActor in self.startSignIn() }
    }

    @MainActor
    private func startSignIn() {
        guard activeSession == nil else { return }

        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: Self.clientId),
            URLQueryItem(name: "redirect_uri", value: Self.redirectURI),
            URLQueryItem(name: "response_type", value: "token"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "prompt", value: "select_account"),
            URLQueryItem(name: "include_granted_scopes", value: "true")
        ]
        guard let authURL = components.url else { return }

        let session = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: Self.redirectScheme
        ) { [weak self] callbackURL, error in
            guard let self else { return }
            self.activeSession = nil
            guard let callbackURL else { return } // user cancelled or error

            // Google returns access_token in the URL fragment, not the query.
            // e.g. <redirect>#access_token=...&expires_in=3600&token_type=Bearer
            let fragment = callbackURL.fragment ?? ""
            var values: [String: String] = [:]
            for pair in fragment.split(separator: "&") {
                let parts = pair.split(separator: "=", maxSplits: 1)
                if parts.count == 2 {
                    let k = String(parts[0])
                    let v = String(parts[1]).removingPercentEncoding ?? String(parts[1])
                    values[k] = v
                }
            }
            guard let token = values["access_token"] else { return }
            self.deliverTokenToWebView(token)
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        activeSession = session
        session.start()
    }

    private func deliverTokenToWebView(_ accessToken: String) {
        // Escape backslashes and single quotes for safe single-quoted JS literal.
        let escaped = accessToken
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let js = "window.__verseRainNativeOAuth && window.__verseRainNativeOAuth('google','\(escaped)')"
        Task { @MainActor in
            self.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    // MARK: ASWebAuthenticationPresentationContextProviding
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
