import Foundation

enum DeepLinkRouter {
    private static let baseURL = URL(string: "https://verserain-web.vercel.app/")!

    static func webURL(for incomingURL: URL) -> URL {
        if incomingURL.scheme == "http" || incomingURL.scheme == "https" {
            return incomingURL
        }

        guard incomingURL.scheme == "verserain" else {
            return baseURL
        }

        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        var queryItems = URLComponents(url: incomingURL, resolvingAgainstBaseURL: false)?.queryItems ?? []
        let pathParts = incomingURL.path
            .split(separator: "/")
            .map(String.init)

        let knownSubjects: Set<String> = [
            "text",
            "ref",
            "invite",
            "room",
            "challenge",
            "set",
            "verse",
            "verseset"
        ]
        let hostSubject = incomingURL.host.flatMap { knownSubjects.contains($0) ? $0 : nil }
        let subject = hostSubject ?? pathParts.first ?? incomingURL.host
        let valueIndex = hostSubject == nil ? 1 : 0
        let value = clean(pathParts.dropFirst(valueIndex).first)

        switch subject {
        case "text":
            append("text", value, to: &queryItems)
        case "ref", "invite":
            append("ref", value, to: &queryItems)
        case "room":
            append("room", value, to: &queryItems)
        case "challenge":
            append("challenge", value, to: &queryItems)
        case "set":
            append("set", value, to: &queryItems)
        case "verse", "verseset":
            append("legacySubject", subject, to: &queryItems)
            append("legacyId", value, to: &queryItems)
            append("legacyApiDomain", clean(pathParts.dropFirst(2).first), to: &queryItems)
            append("legacySessionKey", clean(pathParts.dropFirst(3).first), to: &queryItems)
        default:
            break
        }

        components.queryItems = queryItems.isEmpty ? nil : queryItems
        return components.url ?? baseURL
    }

    private static func append(_ name: String, _ value: String?, to queryItems: inout [URLQueryItem]) {
        guard let value else {
            return
        }

        queryItems.append(URLQueryItem(name: name, value: value))
    }

    private static func clean(_ value: String?) -> String? {
        guard let value,
              value != "None",
              value != "none",
              value != "null",
              !value.isEmpty else {
            return nil
        }

        return value
    }
}
