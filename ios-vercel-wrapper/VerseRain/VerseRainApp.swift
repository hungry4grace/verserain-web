import SwiftUI

@main
struct VerseRainApp: App {
    @StateObject private var webViewModel = WebViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView(model: webViewModel)
                .onOpenURL { url in
                    webViewModel.load(DeepLinkRouter.webURL(for: url))
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
