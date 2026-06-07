import Foundation
import AuthenticationServices
import WebKit

/// Bridges the web app's "Sign in with Apple" button to the native
/// `ASAuthorizationAppleIDProvider`. App Store guideline 4.8 requires Sign in
/// with Apple on iOS when any third-party login (e.g. Google) is offered.
///
/// Flow:
///   1. Web button → `window.webkit.messageHandlers.appleSignIn.postMessage({})`
///   2. We call `ASAuthorizationController` with an Apple ID request.
///   3. On success, we evaluate
///      `window.__verseRainNativeOAuth('apple', '<identityToken>')` in the
///      WebView. The PartyKit backend verifies the JWT against Apple's JWKS;
///      the `aud` claim equals the iOS app's Bundle ID
///      (`com.hopeofglory.verserain`), which is allowlisted in
///      `APPLE_CLIENT_IDS` in `src/party/server.js`.
final class AppleSignInBridge: NSObject, WKScriptMessageHandler,
                               ASAuthorizationControllerDelegate,
                               ASAuthorizationControllerPresentationContextProviding {
    // Settable after init — see GoogleSignInBridge for the explanation.
    // WKWebViewConfiguration's userContentController must be populated BEFORE
    // the WKWebView is created, but the bridge then needs the webView for
    // the callback JS eval, so we wire it up post-creation.
    weak var webView: WKWebView?

    override init() {
        super.init()
    }

    // MARK: WKScriptMessageHandler
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "appleSignIn" else { return }
        Task { @MainActor in self.startSignIn() }
    }

    @MainActor
    private func startSignIn() {
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    // MARK: ASAuthorizationControllerDelegate
    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            return
        }
        // Apple supplies `email` only on the first sign-in. Forward it
        // alongside the JWT so the backend can persist it on the user row
        // for first-time accounts; subsequent sign-ins rely on the `sub`
        // claim already in the JWT.
        let email = credential.email ?? ""
        let givenName = credential.fullName?.givenName ?? ""
        let familyName = credential.fullName?.familyName ?? ""
        let fullName = [givenName, familyName].filter { !$0.isEmpty }.joined(separator: " ")
        Task { @MainActor in
            self.deliverToWebView(idToken: idToken, email: email, name: fullName)
        }
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithError error: Error) {
        print("Apple sign-in failed: \(error)")
    }

    @MainActor
    private func deliverToWebView(idToken: String, email: String, name: String) {
        let escape: (String) -> String = { s in
            s.replacingOccurrences(of: "\\", with: "\\\\")
             .replacingOccurrences(of: "'", with: "\\'")
        }
        let js = "window.__verseRainNativeOAuth && window.__verseRainNativeOAuth('apple','\(escape(idToken))',{email:'\(escape(email))',name:'\(escape(name))'})"
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    // MARK: ASAuthorizationControllerPresentationContextProviding
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
