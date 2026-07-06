# Publishing

How to ship Spider Privacy Browser to F-Droid and Google Play. Store listing text
lives in `apps/mobile/fastlane/metadata/android/<locale>/` (read by both stores).
Bump the version first: `apps/mobile/src/version.ts` (versionName) and
`apps/mobile/android/app/build.gradle` (`versionName` + `versionCode`), then add a
`apps/mobile/fastlane/.../changelogs/<versionCode>.txt`.

## Release signing (both stores)

Release builds are debug-signed by default so anyone can build. A store build
needs a real upload key:

1. Generate a key (once, keep it safe — losing it means you can't update the app):
   ```
   keytool -genkeypair -v -keystore apps/mobile/android/app/spider-release.keystore \
     -alias spider -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Copy `apps/mobile/android/keystore.properties.example` to
   `apps/mobile/android/keystore.properties` (gitignored) and fill in the
   passwords/alias.
3. Build. The app has two editions (Android product flavors — see
   `docs/GECKOVIEW.md`): `standard` (system WebView, ~21 MB) and `gecko` (bundles
   GeckoView, ~92 MB/ABI). Use the flavored Gradle tasks:
   - Standard APKs (per-ABI, F-Droid / local): `cd apps/mobile/android && ./gradlew assembleStandardRelease`
   - Standard AAB (Google Play): `cd apps/mobile/android && ./gradlew bundleStandardRelease` → `apps/mobile/android/app/build/outputs/bundle/standardRelease/`
   - GeckoView APKs (per-ABI, F-Droid / direct APK only — exceeds the 80 MB budget,
     do NOT ship on Play): `cd apps/mobile/android && ./gradlew assembleGeckoRelease`

Never commit the keystore or `keystore.properties`.

> **Which edition goes where:** the `standard` edition is the default and ships to
> both Google Play (AAB) and F-Droid. The `gecko` edition is a separate package
> (`com.spiderprivacybrowser.gecko`, label "Spider (Gecko)") distributed only
> off-Play (F-Droid / direct APK download), because ~92 MB/device is above the
> 80 MB budget on purpose. Both can be installed side by side.

## F-Droid

F-Droid builds from source on their own infrastructure — you don't upload a binary.

- **License:** AGPL-3.0 (`LICENSE`). No proprietary dependencies, no Google Play
  Services — verified.
- **Metadata:** already under `apps/mobile/fastlane/metadata/android/en-US/` and `es-ES/`
  (title, short/full description, changelogs). Add screenshots under
  `.../<locale>/images/phoneScreenshots/` when ready.
- **Submit:** open a merge request against
  [fdroiddata](https://gitlab.com/fdroid/fdroiddata) adding a metadata file for
  `com.spiderprivacybrowser` that points at this repo and the version tag. Each
  release is a signed git tag (e.g. `v0.0.4`) with a matching `versionCode`.
- Tag releases: `git tag v0.0.4 && git push origin v0.0.4`.

## Google Play

- **Account:** a Play Console developer account (one-time fee).
- **Upload:** the signed **AAB** from `bundleRelease` (Play no longer accepts APKs
  for new apps). Consider enrolling in Play App Signing.
- **16 KB page size:** required for new apps; already covered by React Native 0.79.
- **Store listing:** reuse the `apps/mobile/fastlane` title/descriptions. Assets needed:
  - App icon 512×512 — `SpyderBrowser_icon_512.png` (in repo root).
  - Feature graphic 1024×500 — to be created.
  - Phone screenshots (min 2).
- **Privacy policy:** host `PRIVACY.md` at a public URL (e.g. GitHub Pages or the
  raw file) and enter it in the Console. Add a real contact email to `PRIVACY.md`
  first.
- **Data safety form:** declare "no data collected / no data shared" — the app
  collects nothing.
- **Content rating:** complete the questionnaire (a browser is typically rated
  for the higher tiers because it shows arbitrary web content).

## Checklist per release

- [ ] Bump `apps/mobile/src/version.ts` + `versionName`/`versionCode` in `apps/mobile/android/app/build.gradle`.
- [ ] Add `apps/mobile/fastlane/metadata/android/<locale>/changelogs/<versionCode>.txt`.
- [ ] `npm test` and `npx tsc --noEmit` pass.
- [ ] Build the signed AAB and smoke-test it on a device.
- [ ] Tag `vX.Y.Z` and push (F-Droid picks up the tag).
- [ ] Upload the AAB to Play; roll out.
