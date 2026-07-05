# Motor GeckoView (Fase 4)

GeckoView es el motor de Firefox (misma pila que Firefox para Android) embebido
como **alternativa opcional** a `react-native-webview` (que en Android es el
System WebView, es decir Chromium del fabricante). Da protección de privacidad a
nivel de **motor**: Enhanced Tracking Protection y aislamiento de cookies que el
System WebView no expone.

Es **opt-in** y va detrás del flag de build `GECKOVIEW_ENABLED` (default **OFF**,
ver `apps/mobile/.env`). Con el flag apagado la app usa el motor WebView endurecido
de siempre y GeckoView ni se referencia desde JS.

- Selección de motor: `src/components/BrowserEngine.tsx` (`useGecko = FEATURES.geckoView && Android`).
- Runtime: `android/.../gecko/GeckoRuntimeProvider.kt` (singleton por proceso).
- Vista: `android/.../gecko/GeckoViewManager.kt` + JS `src/components/GeckoWebView.tsx`.

## Arquitectura de privacidad

La protección se reparte en dos capas: lo que hace **Gecko de forma nativa** y lo
que **inyectamos** con `@spider/privacy-js`.

| Defensa | Cómo se aplica en GeckoView | Fuente |
| --- | --- | --- |
| Bloqueo de rastreadores (ads/analytics/social/cryptomining/fingerprinting) | **Nativo** — ETP `STRICT` + `AntiTracking.STRICT` en el runtime | Gecko |
| Aislamiento de cookies de terceros | **Nativo** — `CookieBehavior.ACCEPT_NON_TRACKERS` | Gecko |
| Contador de rastreadores por pestaña | **Nativo** — `ContentBlocking.Delegate.onContentBlocked` → evento `onBlocked` | Gecko + app |
| Canvas / WebGL fingerprint | **Inyectado** — shims JS | privacy-js |
| navigator.* (hardwareConcurrency, deviceMemory, platform, languages, maxTouchPoints, webdriver) | **Inyectado** — shims JS | privacy-js |
| Enumeración de fuentes | **Inyectado** — shim JS | privacy-js |
| Timezone → UTC | **Inyectado** — shim JS | privacy-js |
| Auto-dismiss de banners de cookies | **Inyectado** — autoconsent | privacy-js |

### Cómo se inyecta privacy-js

GeckoView no tiene `injectedJavaScriptBeforeContentLoaded`. La vía nativa para
correr código a `document_start` es una **WebExtension** con un content script.

- `scripts/gen-gecko-privacy-ext.js` genera la extensión en
  `android/app/src/main/assets/privacy-ext/` **desde `@spider/privacy-js`** — la
  MISMA fuente única que inyecta el motor WebView. Regenerar con `npm run gen:gecko-ext`
  cada vez que cambie `@spider/privacy-js` (el output está commiteado).
- El content script corre en `world: "MAIN"` (MV3), así que los shims parchean el
  contexto **real de la página** (un content script en mundo aislado no afectaría a
  `navigator`/`Canvas` de la página) y además evita la CSP del sitio.
- `GeckoRuntimeProvider` la instala con `webExtensionController.ensureBuiltIn(...)`
  al crear el runtime.

Verificado en `browserleaks.com/javascript` (emulador API 34, x86_64):
`navigator.platform = "Linux armv8l"`, `hardwareConcurrency = 8`, `deviceMemory = 8`,
`languages = ["es-ES","es","en-US","en"]`, `maxTouchPoints = 5`, `webdriver = false`,
`timeZone = "UTC"` — todos spoofeados.

## Análisis de redundancias (privacy-js vs. defensas nativas de Gecko)

Qué defensas del bundle JS son redundantes con lo que Gecko ya hace, y cuáles no:

- **Bloqueador de peticiones in-page (`blocker.ts`): REDUNDANTE.** ETP `STRICT`
  bloquea las peticiones a rastreadores (ads/analytics/social/cryptomining/
  fingerprinting) a nivel de red en el propio motor, cubriendo subrecursos y
  `fetch`/`XHR`/`sendBeacon`. Por eso el generador **NO** incluye el blocker en la
  extensión, y el contador viene del delegado nativo `onContentBlocked` en vez de
  mensajes `postMessage`.
- **Shims de fingerprinting (canvas, webgl, navigator, fonts, timezone): NO
  redundantes hoy.** La categoría `FINGERPRINTING` de ETP bloquea *scripts de
  fingerprinting conocidos por origen*, pero **no** spoofea las APIs para el resto
  de scripts (first-party o no listados). El equivalente nativo que sí spoofea es
  `privacy.resistFingerprinting` (RFP, la defensa de Tor Browser), que **GeckoView
  no expone** en su API estable de settings. Mientras RFP no esté activable, los
  shims siguen aportando y se inyectan.
  - **Optimización futura:** si se logra activar RFP (vía acceso a prefs), canvas/
    webgl/navigator/fonts/timezone pasarían a ser redundantes y se podrían quitar de
    la extensión, dejando solo `autoconsent`.
- **autoconsent: NO redundante.** No hay equivalente nativo.

## Limitaciones conocidas (WIP)

- **No honra toggles individuales ni excepciones por sitio.** La extensión se
  instala a nivel de runtime con el set **completo** de hardening; el motor Gecko
  ignora, de momento, los switches por-defensa y las excepciones por dominio que sí
  respeta el motor WebView. Granularidad = trabajo futuro (requiere mensajería
  content-script ↔ nativo o (re)instalar según settings).
- **Crash en Android 16 / API 37.** GeckoView 140 hace SIGSEGV nativo en el arranque
  en API 37; probar en un AVD **≤ 35**. Subir a GeckoView 152 lo evitaría, pero exige
  `compileSdk 36` + AGP 8.9.1 (ver comentarios en `android/app/build.gradle`).
- **Tamaño del APK.** GeckoView empotra el motor de Firefox (`libxul.so`). Ver
  `docs/PUBLISHING.md` (splits por ABI / AAB) — la app nunca debe superar 80 MB por
  dispositivo, así que un APK universal con Gecko está descartado.
- **Cosmético del render.** El `SurfaceView` del compositor se ordena sobre la
  ventana (`setZOrderOnTop`) para ser visible sobre el fondo opaco del contenedor;
  como efecto, no respeta el `borderRadius` del contenedor (esquinas cuadradas) y
  taparía overlays RN dentro del área del webview.
