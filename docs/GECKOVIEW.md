# Motor GeckoView (Fase 4)

GeckoView es el motor de Firefox (misma pila que Firefox para Android) embebido
como **alternativa opcional** a `react-native-webview` (que en Android es el
System WebView, es decir Chromium del fabricante). Da protección de privacidad a
nivel de **motor**: Enhanced Tracking Protection y aislamiento de cookies que el
System WebView no expone.

Se distribuye como una **edición aparte** (ver "Dos ediciones" abajo): el build
por defecto (`standard`) no enlaza GeckoView y la edición `gecko` sí. La selección
del motor es automática según lo que el build contenga, así que el mismo bundle JS
sirve para ambas.

- Selección de motor: `src/components/BrowserEngine.tsx` — detecta en runtime si el
  view manager nativo `RNTGeckoView` está compilado
  (`UIManager.hasViewManagerConfig`); si lo está usa GeckoView, si no, el WebView.
  `GECKOVIEW_ENABLED` queda como kill-switch de desarrollo (ponerlo `false` fuerza
  el WebView incluso en un build `gecko`).
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
- **Android 16 (API 36): OK en release, crash solo en debug.** GeckoView 140 hace
  SIGSEGV nativo (`GeckoLoader→putenv`) solo en builds **debuggables**, que
  auto-leen un archivo de config de debug con una entrada nula. Un **release** no lo
  lee, así que corre bien. **Verificado en dispositivo físico Android 16 / API 36 /
  arm64** (`assembleRelease`): example.com renderiza, la extensión de hardening
  instala. En debug, mitigado con `configFilePath("")` en `GeckoRuntimeProvider`.
  (Emulador API 34/35 sigue valiendo para debug.)
- **Tamaño del APK — NO cabe en el presupuesto de 80 MB.** GeckoView empotra el
  motor de Firefox (`libxul.so`, ~143 MB sin comprimir). Con ABI splits activados
  (`android.splits.abi`, ya configurado — evitan el APK universal de ~300 MB), el
  release **por-ABI** medido (v0.0.11, sin minify) es:

  | ABI | APK release |
  | --- | --- |
  | arm64-v8a | **92 MB** |
  | armeabi-v7a | 89 MB |
  | x86_64 | 97 MB |
  | x86 | 101 MB |

  El `lib/` comprimido de arm64 ya son 68.7 MB (libxul domina), así que **ni con
  splits ni con minify se baja de 80 MB** — GeckoView es ~90 MB/dispositivo por
  naturaleza (rango Firefox Focus). **Solución adoptada: dos ediciones** (abajo). La
  regla de los 80 MB aplica al build por defecto (`standard`, ~21 MB, va a Play +
  F-Droid); la edición `gecko` supera el presupuesto a propósito y se distribuye
  **fuera de Play** (F-Droid / APK directo) como paquete aparte que el usuario elige.

## Dos ediciones (product flavors)

Un mismo código produce dos APKs mediante *product flavors* de Android
(dimensión `engine`):

| Flavor | Motor | Tamaño | Canal | Regla 80 MB |
| --- | --- | --- | --- | --- |
| `standard` (por defecto) | System WebView | ~21 MB | Google Play + F-Droid | ✅ cumple |
| `gecko` | GeckoView | ~92 MB/ABI | F-Droid / APK directo (fuera de Play) | ❌ a propósito |

Cómo está montado:

- **Dependencia condicional:** GeckoView es `geckoImplementation(...)` en
  `app/build.gradle`, así que **solo el flavor `gecko` la enlaza**; el `standard` ni
  la descarga.
- **Código nativo por flavor:** el Kotlin de Gecko vive en `src/gecko/java/...`
  (compilado solo para ese flavor) y sus assets en `src/gecko/assets/privacy-ext/`.
  Un shim `engine/EnginePackages.kt` existe en ambos source sets (`src/standard` y
  `src/gecko`): registra `GeckoViewPackage` solo en `gecko`. `MainApplication` (en
  `src/main`) llama a `EnginePackages.extraPackages()` sin depender de clases Gecko.
- **JS agnóstico:** `BrowserEngine` detecta el motor compilado en runtime (ver
  arriba), así que el bundle es idéntico en ambas ediciones.
- **Paquete distinto:** el flavor `gecko` usa `applicationIdSuffix ".gecko"` y la
  etiqueta "Spider (Gecko)", de modo que ambas ediciones conviven instaladas.

Builds:

```
# Edición estándar (WebView, ~21 MB) — Play + F-Droid
cd apps/mobile/android && ./gradlew assembleStandardRelease   # APKs por ABI
cd apps/mobile/android && ./gradlew bundleStandardRelease      # AAB para Play

# Edición GeckoView (~92 MB/ABI) — F-Droid / APK directo
cd apps/mobile/android && ./gradlew assembleGeckoRelease
```

Ver `docs/PUBLISHING.md` para firmado y distribución.
- **Cosmético del render.** El `SurfaceView` del compositor se ordena sobre la
  ventana (`setZOrderOnTop`) para ser visible sobre el fondo opaco del contenedor;
  como efecto, no respeta el `borderRadius` del contenedor (esquinas cuadradas) y
  taparía overlays RN dentro del área del webview.
