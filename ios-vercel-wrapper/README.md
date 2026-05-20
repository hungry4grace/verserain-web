# Verse Rain iOS Vercel Wrapper

This is a small native iOS shell for the existing App Store app:

- App name: `Verse Rain`
- Bundle ID: `com.hopeofglory.verserain`
- Version: `3.6.1`
- Build: `42`
- Hosted app URL: `https://www.verserain.com/`

The app uses `WKWebView`, keeps the `verserain://` URL scheme, and forwards supported deep links into the hosted Vercel app.

## Build And Upload

1. Install full Xcode from the Mac App Store if it is not installed.
2. Open `VerseRain.xcodeproj` in Xcode.
3. Select the `VerseRain` target, then set your Apple developer team under Signing & Capabilities.
4. Confirm the bundle identifier is `com.hopeofglory.verserain`.
5. Select `Any iOS Device` as the run destination.
6. Choose Product > Archive.
7. In Organizer, choose Distribute App > App Store Connect.
8. In App Store Connect, create a new version for the existing Verse Rain app record, select the uploaded build, and submit it for review.

Apple references:

- Create a new version: https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version
- Upload builds: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds
- Choose a build to submit: https://developer.apple.com/help/app-store-connect/manage-builds/choose-a-build-to-submit
- Submit an app: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app

## Review Note Suggestion

Verse Rain is now powered by the hosted VerseRain learning game at `https://www.verserain.com/`. The app includes scripture memorization gameplay, multiplayer rooms, accessible voice recitation, custom verse sets, progress/garden rewards, and referral links. Microphone and speech recognition permissions are requested only when a user chooses voice recitation modes.

Because App Review Guideline 4.2 expects apps to offer functionality beyond a repackaged website, test the build on a real device and make sure the game, voice modes, login, and sharing flows are working before submission.
