# Mühlen.app for Android

Android app of [Mühlen.app](https://muehlen.app), a guide to historic mills
(starting with the 43 mills of the Minden-Lübbecke district, Germany): map,
audio guides, 360° panoramas, 3D models, quizzes and then-and-now comparisons.
The app interface and content are in German.

The app is a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity)
built with [androidbrowserhelper](https://github.com/GoogleChrome/android-browser-helper).
It opens the web app at `https://muehlen.app/app` in the browser installed on the
device. With a Chromium-based browser (Chrome, Brave, Vanadium, Cromite …) it runs
full screen; with other browsers it opens as a custom tab with an address bar.
Content can be saved for offline use in the app's settings.

The content and the web app are served by erleben.app and are not part of this
repository.

## Build

```sh
bun generate-hosts.mjs   # optional: refresh the list of trusted domains
./gradlew assembleRelease
```

`app/src/main/res/values/hosts.xml` is committed, so the build needs no network
access to erleben.app. Signing uses `ANDROID_KEYSTORE_PATH` and
`ANDROID_KEYSTORE_PASSWORD` if set, otherwise the APK is unsigned.

## Releases

1. Raise `versionCode` and `versionName` in `app/build.gradle`.
2. Add `changelogs/<versionCode>.txt` under `fastlane/metadata/android/de-DE/`
   and `en-US/`.
3. Push a tag `v<versionName>`. The workflow builds the signed APK and attaches
   it to a GitHub release (IzzyOnDroid picks it up from there).
4. For Google Play, start the workflow manually; it uploads the bundle to the
   internal track.

Store texts and images live in `fastlane/metadata/android/` and are used by
Google Play (`play-metadata.mjs`, German texts), F-Droid and IzzyOnDroid.
`en-US` is the fallback locale and holds the images for all locales.
Changelogs exist per locale as `changelogs/<versionCode>.txt` (plain ASCII, max. 500 bytes).

## License

Code: Apache License 2.0, © Seeger & Krämer GbR (erleben.app).
The name „Mühlen.app“ and the logo are not covered by the license.
