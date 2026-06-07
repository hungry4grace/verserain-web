import Foundation
import CommonCrypto
import AuthenticationServices
import WebKit

/// Bridges the web app's "Sign in with Google" button to a native
/// `ASWebAuthenticationSession`. Google blocks OAuth inside embedded
/// WKWebViews, so the web button posts a message to JS handler
/// `googleSignIn`; we open the OS Safari-backed auth window, harvest the
/// authorization code from the callback, exchange it (with PKCE) for an
/// access_token, and feed that back to the web app via
/// `window.__verseRainNativeOAuth('google', '<token>')`.
///
/// Note: iOS OAuth clients only support the authorization code flow with
/// PKCE — the implicit `response_type=token` flow returns 400
/// `unsupported_response_type`.
final class GoogleSignInBridge: NSObject, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding {
    // iOS OAuth Client ID (Application type: iOS, Bundle ID
    // com.hopeofglory.verserain).
    static let clientId = "761845973381-2gakrrvbmtqg66ds3uo5dscdleggevml.apps.googleusercontent.com"

    // Reverse-DNS form of the iOS client ID — Google auto-registers this as
    // the redirect URI for the iOS OAuth client.
    static let redirectScheme = "com.googleusercontent.apps.761845973381-2gakrrvbmtqg66ds3uo5dscdleggevml"
    static let redirectURI = "\(redirectScheme):/oauth2redirect/google"

    // Must be settable AFTER init: the bridge has to be registered on the
    // WKWebViewConfiguration's userContentController BEFORE the WKWebView is
    // created (Apple docs: "WKWebViewConfiguration is consulted only during
    // web view initialization"), but the bridge then needs the webView ref
    // to inject the OAuth callback JS. So we init with no webView and the
    // caller wires it up after `WKWebView(configuration:)`.
    weak var webView: WKWebView?
    private var activeSession: ASWebAuthenticationSession?
    // Held only for the duration of one sign-in attempt (verifier + state).
    private var pendingVerifier: String?
    private var pendingState: String?

    override init() {
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

        // PKCE: random 64-char verifier, SHA-256 then base64url for the challenge.
        let verifier = Self.randomURLSafeString(byteCount: 32)
        let challenge = Self.codeChallenge(forVerifier: verifier)
        let state = Self.randomURLSafeString(byteCount: 16)
        self.pendingVerifier = verifier
        self.pendingState = state

        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: Self.clientId),
            URLQueryItem(name: "redirect_uri", value: Self.redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "prompt", value: "select_account")
        ]
        guard let authURL = components.url else { return }

        let session = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: Self.redirectScheme
        ) { [weak self] callbackURL, error in
            guard let self else { return }
            let verifier = self.pendingVerifier
            let expectedState = self.pendingState
            self.activeSession = nil
            self.pendingVerifier = nil
            self.pendingState = nil

            guard let callbackURL else { return } // user cancelled or error

            // Parse query items from the redirect URL.
            guard let comps = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false) else { return }
            let items = comps.queryItems ?? []
            let value: (String) -> String? = { name in items.first { $0.name == name }?.value }

            if let returnedState = value("state"), returnedState != expectedState { return }
            guard let code = value("code"), let verifier else { return }

            Task { await self.exchangeCodeAndDeliver(code: code, verifier: verifier) }
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        activeSession = session
        session.start()
    }

    /// Exchange the authorization code for tokens at Google's token endpoint
    /// using PKCE. The iOS client type has no client_secret, so the verifier
    /// is the only proof we're the same client that initiated the request.
    private func exchangeCodeAndDeliver(code: String, verifier: String) async {
        var body = URLComponents()
        body.queryItems = [
            URLQueryItem(name: "client_id", value: Self.clientId),
            URLQueryItem(name: "code", value: code),
            URLQueryItem(name: "code_verifier", value: verifier),
            URLQueryItem(name: "grant_type", value: "authorization_code"),
            URLQueryItem(name: "redirect_uri", value: Self.redirectURI)
        ]
        let formData = (body.percentEncodedQuery ?? "").data(using: .utf8) ?? Data()

        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = formData

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                if let body = String(data: data, encoding: .utf8) {
                    print("Google token exchange failed: \(body)")
                }
                return
            }
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let accessToken = json["access_token"] as? String else {
                return
            }
            await deliverTokenToWebView(accessToken)
        } catch {
            print("Google token exchange error: \(error)")
        }
    }

    @MainActor
    private func deliverTokenToWebView(_ accessToken: String) {
        // Escape backslashes and single quotes for safe single-quoted JS literal.
        let escaped = accessToken
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let js = "window.__verseRainNativeOAuth && window.__verseRainNativeOAuth('google','\(escaped)')"
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    // MARK: ASWebAuthenticationPresentationContextProviding
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }

    // MARK: PKCE helpers

    /// Random URL-safe string of `byteCount` bytes, base64url-encoded
    /// (RFC 7636 unreserved characters only).
    private static func randomURLSafeString(byteCount: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        _ = SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes)
        return Data(bytes).base64URLEncodedString()
    }

    /// SHA-256(code_verifier) → base64url.
    private static func codeChallenge(forVerifier verifier: String) -> String {
        let data = Data(verifier.utf8)
        var digest = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes { _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &digest) }
        return Data(digest).base64URLEncodedString()
    }
}

private extension Data {
    /// Base64 with URL-safe alphabet and no padding (RFC 7636 §4.2).
    func base64URLEncodedString() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
