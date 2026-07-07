# ROADMAP — Spider Privacy Browser

> Plan de fases para avanzar el proyecto, basado en el **estado real del código** (no en lo aspiracional).
> Analizado el 2026-07-01. Complementa `privacy-browser-mobile.md` (visión).

Leyenda: `[x]` hecho · `[~]` parcial / solo maqueta · `[ ]` pendiente

---

## Estado actual (resumen honesto)

La app **funciona como shell de navegación** con hardening JS real, pero varias funciones "de privacidad" son **solo UI sin backend**:

| Área | Estado | Realidad |
|---|---|---|
| Shell 3 pantallas (Browser/Tabs/Settings) | `[x]` | Navegación manual por estado en `App.tsx`, sin librería de navegación |
| Tabs en memoria | `[x]` | `tabStore`, sin persistencia (correcto para privacidad) |
| Privacy JS bundle | `[x]` | `buildPrivacyBundle()` real y controlado por toggles |
| WebView hardened | `[x]` | Incognito, sin caché, UA spoof, `mixedContentMode=never` |
| **Monorepo (paquetes)** | `[x]` | `@spider/privacy-js` y `@spider/network` como workspaces reales y fuente única |
| Bloqueo de trackers | `[x]` (JS) | Blocker in-page (`buildRequestBlocker`) envuelve fetch/XHR/sendBeacon + limpia script/img; ~110 dominios de `@spider/network`. Inyecta en iframes solo en perfil Estricto. Bloqueo nativo de TODO subrecurso sigue en Fase 2 |
| Contador "X BLOCKED" | `[x]` | Real: cada bloqueo hace `postMessage({__spider:'blocked', d})` → `recordBlocked(tabId, dominio)` por-tab |
| Panel de bloqueados | `[x]` | Tocar el badge abre un modal con los dominios bloqueados y su nº (por-tab) |
| Perfiles de privacidad | `[x]` | `privacyLevel` Balanceado (default, menos anti-bot) / Estricto (agresivo) / Personalizado; presets en `settingsStore`; segmented control en Settings |
| Autoconsent cookies | `[x]` | Reescrito seguro: solo rechazos reales por ID + ocultar banner; NO clica pago/suscripción/guardar-por-defecto |
| Coherencia anti-fingerprint | `[x]` | UA↔navigator coherentes (perfil Android, `USER_AGENT` única fuente); canvas noise estable por-sesión |
| i18n (ES/EN) | `[x]` | `src/i18n` (`useT` + translations), selector en Settings, persistido; todas las pantallas traducidas |
| DNS cifrado (Private DNS/DoT) | `[x]` (A) ✔ verificado | Módulo nativo `PrivateDns`: estado real + abrir Ajustes + copiar host DoT al portapapeles. Verificado en emulador (API 37): refleja activo/off correctamente |
| DNS cifrado (DoH in-app VPN) | `[x]` v2 ✔ verificado | `DnsVpnService` (solo-DNS, DoH vía OkHttp, anti-bucle); toggle en Settings. v2: IPv4+IPv6, UDP+TCP (fallback TC=1→TCP en `DnsTcp`), notificación foreground (special-use FGS), `stop()` real (cierra el tun fd). Setup en hilo de fondo (evita `NetworkOnMainThreadException`). Verificado en emulador (API 37): arranca/resuelve/detiene end-to-end |
| Red privada (selector) | `[x]` ✔ | Selector unificado `Directa / Orbot (Tor) / WireGuard` en `@spider/network` (`NETWORK_MODE_LIST`); las tres opciones funcionan (WireGuard vía import de config) |
| Orbot (Tor) | `[x]` ✔ verificado | `OrbotModule.kt` (detecta/lanza + estado en vivo por transporte VPN). Verificado en dispositivo físico (Android 16): salida por Tor confirmada en `check.torproject.org` |
| Excepciones por sitio | `[x]` | **Task 9 hecho**: override por dominio `off`/`strict` en `settingsStore` (`siteExceptions` + `resolveHardening`, persistido); precedencia sobre el master global; hoja por-sitio al tocar el badge de escudo; recarga al cambiar |
| VPN WireGuard | `[x]` code-complete | `WireGuardModule.kt` + `wireguard-android` GoBackend (VpnService real); importa un `.conf` genérico (Mullvad u otro). Parseo verificado en dispositivo; connect pendiente de un `.conf` real |
| GeckoView | `[ ]` | No existe (solo `MainActivity`/`MainApplication` por defecto) |
| Monorepo (mover app a `apps/mobile/`) | `[x]` ✔ (2026-07-05) | App RN movida a `apps/mobile/`; workspaces `apps/*`+`packages/*`; build Android verificado (BUILD SUCCESSFUL). iOS reescrito sin compilar (falta Mac) |
| Persistencia (incógnito-puro) | `[x]` | **Solo el idioma** sobrevive al cierre/kill (`partialize`: `language`). Toggles, perfil, DoH, excepciones por-sitio, `networkMode` y pestañas se reinician a defaults en cada arranque. DNS VPN: `START_NOT_STICKY` + `onTaskRemoved` (no revive en segundo plano; batería) |
| Tests / lint | `[x]` | Jest 38/38 (privacyBundle, tabStore, blocklist, requestBlocker, i18n, App smoke, env, siteExceptions); `npm run lint` pasa (0 errores) |

---

## Próxima sesión (retomar aquí)

Pendientes inmediatos, por prioridad:

1. **Verificar en dispositivo/emulador** (necesitan tu interacción, no automatizable):
   - ~~DoH in-app (VPN): activar toggle → aceptar consentimiento VPN → comprobar resolución~~ → **VERIFICADO** (API 37, 2026-07-04): arranca, `example.com` carga con VPN activa, y apagar detiene el servicio. Falta solo ejercitar TCP (respuesta grande) e IPv6.
   - ~~Private DNS (DoT): activar → estado 🟢~~ → **VERIFICADO** (API 37): la app refleja activo/off según `private_dns_mode`.
   - Orbot: instalar/lanzar → salida por Tor.
   - El País con perfil **Balanceado**: confirmar que ya no sale el muro anti-bot.
2. ~~**Task 9 — Excepciones por sitio**~~ → **HECHO**: `siteExceptions` (`off`/`strict`) en `settingsStore`, `resolveHardening()` con precedencia sobre el master, hoja por-sitio al tocar el badge de escudo, persistido. Verificar UX en dispositivo.
3. ~~**DoH VPN v2**: notificación foreground, TCP-DNS, IPv6~~ → **HECHO** (falta solo `reconexión al cambiar de red` y verificar en dispositivo).
4. **Fase 2 — bloqueo nativo de peticiones** (`shouldInterceptRequest`/`WKContentRuleList`): el salto real de cobertura de trackers (JS tiene techo). react-native-webview no lo expone → puente nativo o GeckoView (Fase 4).
5. ~~**Auditabilidad** (pediste): crear `LICENSE`, `SECURITY.md` (threat model honesto), `AUDIT.md` (cómo verificar).~~ → **HECHO**: `LICENSE` (AGPL-3.0), `SECURITY.md` con modelo de amenaza (qué protege / qué NO / supuestos), y `docs/AUDIT.md` (cómo verificar cada afirmación con comandos).

> Nota de sesión: el error `RNGetRandomValues` se resolvió eliminando `react-native-get-random-values` (incompatible con RN 0.76/New Arch); `uuid.ts` usa `crypto.getRandomValues` con fallback. El emulador Pixel_7 se colgó en `authorizing`; se arregla con cold boot (`emulator -avd Pixel_7 -no-snapshot-load`).

---

## Fase 1 — MVP funcional + DNS real

Objetivo: que **todo lo que se ve en la UI haga algo real**, incluyendo la resolución DNS privada. Combina lo antes separado en "MVP" y "DNS". La parte JS no necesita código nativo; la parte DNS sí requiere config nativa ligera (sin módulos nativos nuevos).

### 1a. Cerrar la brecha UI ↔ lógica (solo JS)
- [x] **Conectar el botón shield real**: `toggleShield` en `BrowserScreen` alterna `hardeningEnabled` y recarga la página; el badge ENCRYPTED/UNPROTECTED lo refleja.
- [x] **Contador de trackers real**: `incrementTrackers(tabId)` por-tab en `onBlocked`; el badge lee `activeTab.trackersBlocked` (fuera el `useState(12)`).
- [x] **Ampliar el blocklist**: movido a `@spider/network` (`blocklist.ts`: `TRACKER_DOMAINS` + `isBlockedUrl`), ampliado a ~60 dominios; `HardenedWebView` lo consume.
- [x] **Persistir settings** con AsyncStorage vía middleware `persist` de Zustand (`partialize`: solo preferencias; NO tabs/historial; `networkMode` excluido para no asumir túnel al arrancar).
- [x] **Restaurar ESLint**: `.eslintrc.js` recreado (extiende `@react-native`, con override para entorno jest); `npm run lint` pasa (0 errores).
- [x] **Regenerar UUID de tabs**: helper `src/utils/uuid.ts` (`uuidv4` v4). Usa `crypto.getRandomValues` si está disponible y cae a `Math.random` si no (los IDs de tab son efímeros, no requieren CSPRNG). Se **eliminó** `react-native-get-random-values` (exigía RN ≥0.81 y fallaba al linkar `RNGetRandomValues` en New Arch).
- [x] **Tests base**: `__tests__/privacyBundle.test.ts`, `tabStore.test.ts`, `blocklist.test.ts` (+ App smoke). Jest resuelve `@spider/*` y mockea WebView/AsyncStorage/SafeArea. 21/21 verdes.

### 1b. DNS cifrado real

> ⚠️ **Corrección técnica:** NO existe un `<dns-over-https>` en `network_security_config.xml` (ese archivo solo controla certificados/pinning/tráfico en claro, no el resolver). Android WebView usa el DNS del sistema, así que no se puede forzar DoH por config. Hay dos vías reales:

**A. Private DNS (DoT) del sistema — HECHO:**
- [x] `DOT_HOSTNAMES` por proveedor en `@spider/network`.
- [x] Módulo nativo `PrivateDnsModule.kt` (+ `PrivateDnsPackage`): lee `private_dns_mode`/`private_dns_specifier` y abre `android.settings.PRIVATE_DNS_SETTINGS`.
- [x] Wrapper `src/native/privateDns.ts` (`getStatus`/`openSettings`/`resolveState`).
- [x] Settings refleja el **estado real** (activo/otro/automático/off) y guía a activarlo con el host DoT del proveedor. Se refresca al volver de Ajustes (AppState).
- [x] **Verificado en emulador (Android 16/API 37, 2026-07-04)**: con `private_dns_mode=hostname` → `dns.mullvad.net`, la cabecera pasa a "● DNS cifrado activo" (verde) y `dumpsys connectivity` muestra `UsePrivateDns: true, ValidatedPrivateDnsAddresses: [194.242.2.2]`. Con `off`, la app muestra el CTA "Activar DNS privado".

**B. DoH in-app automático (VpnService) — v1 HECHO:**
- [x] `dns/DnsVpnService.kt`: VpnService solo-DNS (rutea solo `10.111.222.3/32`), lee paquetes del tun, resuelve por DoH (OkHttp) y responde. Resolver DNS propio pre-resuelto para evitar el bucle de resolución del host DoH.
- [x] `dns/DnsPacket.kt`: parse/build IPv4+UDP con checksum IP.
- [x] `dns/DnsVpnModule.kt` (+ Package, registrado): consentimiento VPN (`VpnService.prepare` + `ActivityEventListener`), start/stop/isRunning.
- [x] Manifest: `<service>` con `BIND_VPN_SERVICE` + `FOREGROUND_SERVICE`; OkHttp en `build.gradle`.
- [x] Wrapper `src/native/dnsVpn.ts` + toggle "DoH in-app (VPN)" en Settings.
- [x] **Fix hilo principal**: el pre-resolve del host DoH (`InetAddress.getAllByName`) y el `establish()` corren ahora en un hilo de fondo desde `onStartCommand` (el v1 los ejecutaba en el main thread → `NetworkOnMainThreadException` al probar en dispositivo).
- [x] **Notificación foreground (v2)**: `startForeground` con canal `spider_dns_vpn` + acción "Detener"; `foregroundServiceType="specialUse"` (+ property) y permisos `FOREGROUND_SERVICE_SPECIAL_USE`/`POST_NOTIFICATIONS` (pedido best-effort en `dnsVpn.ts`). Mantiene vivo el túnel contra la muerte en background.
- [x] **IPv6 (v2)**: el túnel añade dirección/DNS/ruta IPv6 (`fd00:111:222::3`); `DnsPacket` parsea/construye IPv4 e IPv6 con checksum de transporte (pseudo-cabecera).
- [x] **TCP-DNS (v2)**: `DnsTcp` implementa el mini-stack TCP (handshake → `[len][query]` → `[len][response]` → FIN). Las respuestas UDP mayores que el MTU vuelven truncadas (TC=1) para forzar el reintento por TCP.
- [x] **Fix `stop()` (bug de v1)**: un `VpnService` con túnel establecido queda *bound* por el framework de VPN, así que `stopSelf()` **no** lo destruye (ni `am stopservice` podía). El nuevo `teardown()` **cierra el `ParcelFileDescriptor`** del tun (desmonta la interfaz y libera el binding) antes de `stopForeground`/`stopSelf`. Usado en `ACTION_STOP`/`onRevoke`/`onTaskRemoved`.
- [x] **Fix carrera del toggle**: `isRunning` se marca `true` en `onStartCommand` (no al final del setup asíncrono), evitando que `refreshDns()` del `AppState` lea `false` justo tras `start()` y rebote el toggle a OFF.
- [x] **Verificado en dispositivo (Android 16/API 37, 2026-07-04)**: consentimiento VPN OK; `dumpsys` confirma foreground `types=0x40000000` (special-use) + notificación `spider_dns_vpn`; `example.com` carga con la VPN activa (resolución DoH real end-to-end); apagar el toggle **detiene** el servicio y quita el icono de llave. (El pre-resolve del host DoH y el `establish()` ya no crashean en el main thread.)
- [ ] Verificación pendiente fina: forzar una respuesta grande (DNSSEC/TXT) para ejercitar la vía **TCP**, y probar la ruta **IPv6** (el emulador usó IPv4). Cubierto por `DnsPacketTest` a nivel de paquete.
- [ ] Mejoras pendientes: reconexión al cambiar de red; honrar el tamaño EDNS0 anunciado por el cliente en vez del umbral por MTU.
- [ ] iOS: `NEDNSSettingsManager`/`NEPacketTunnelProvider` (requiere entitlement).

---

## Fase 2 — Content blocking serio (nativo por plataforma)

Objetivo: pasar del `onShouldStartLoadWithRequest` (que solo intercepta navegaciones top-level, no subrecursos) a bloqueo real de peticiones.

- [x] **iOS — `WKContentRuleList`**: `SpiderContentRuleStore` (dentro del pod de `react-native-webview`, vía patch-package) compila las reglas JSON con `WKContentRuleListStore` y las instala en cada `WKWebView`; el módulo RN `ios/.../SpiderContentBlocker.m` lo alimenta desde JS. **Code-complete pero sin verificar** (requiere build en macOS/Xcode; falta añadir `SpiderContentBlocker.m` al target del `.xcodeproj`). Ver `docs/CONTENT_BLOCKING.md`.
- [x] **Android — interceptación de recursos**: `shouldInterceptRequest` en el `RNCWebViewClient` (patch-package sobre `react-native-webview`) que consulta al módulo nativo `NativeBlocklist`. Bloquea subrecursos de hosts rastreadores antes de que salgan a la red; la lista viene del pipeline `@spider/content-blocking` y sigue el master shield. Verificado en emulador.
- [x] **Filter lists**: pipeline `@spider/content-blocking` que convierte sintaxis EasyList/AdGuard a (a) host list para Android/JS y (b) `WKContentRuleList` JSON para iOS. Fuente editable en `spiderFilters.ts`; cómo actualizar desde upstream en `docs/CONTENT_BLOCKING.md`.
- [x] **Conectar el contador real** (Fase 1) a estos bloqueos nativos: cada bloqueo nativo emite `spiderNativeBlocked` y `BrowserScreen` lo atribuye al contador de la pestaña activa.

---

## Fase 3 — Completar el monorepo (mover la app a `apps/mobile/`)

Objetivo: terminar la migración iniciada. Los paquetes ya son workspaces; falta mover la app nativa cuando el código nativo compartido lo justifique.

- [x] Workspaces npm activos (`packages/*`) con `@spider/privacy-js` y `@spider/network`.
- [x] `src/privacy/bundle.ts` reducido a adaptador que consume `@spider/privacy-js` (fuente única).
- [x] Lista DoH unificada en `@spider/network` y consumida por `SettingsScreen`.
- [x] `metro.config.js` (`watchFolders`) y `tsconfig.json` (`paths`) configurados para el workspace.
- [x] **Mover la app RN a `apps/mobile/`** (hecho 2026-07-05): `git mv` de `android/`, `ios/`, `src/`, `__tests__/`, `fastlane/`, `.bundle/` y toda la config JS a `apps/mobile/`. Rutas reescritas por el hoisting de npm: `settings.gradle` `includeBuild` del gradle-plugin (3 niveles → `node_modules` raíz), `app/build.gradle` `reactNativeDir`/`codegenDir`/`cliFile` (4 niveles), `metro.config.js` `watchFolders`/`nodeModulesPaths` a la raíz, `jest`/`tsconfig` `@spider/*` a `../../packages`. El **Podfile ya resolvía con `node` (`require.resolve`)** así que iOS no necesitó reescritura de rutas (pendiente compilar en Mac). El asset `logo.png` (requerido por Home/Drawer/About) se movió a `apps/mobile/logo.png` y ahora sí se trackea. **Verificado: `gradlew :app:assembleDebug` → BUILD SUCCESSFUL (APK generado); `tsc`/`lint`/`test` 60/60 verdes.**
- [x] Añadir `apps/*` a `workspaces` en el `package.json` raíz (raíz = paraguas de workspaces con scripts delegados `-w apps/mobile` + `postinstall: patch-package`).
- [x] Extraer las reglas de content-blocking a `packages/content-blocking/` (ya estaba: paquete `@spider/content-blocking` con el pipeline de filter lists — casilla obsoleta cerrada).
- [x] (Opcional) Evaluado pnpm+Turborepo: **se mantiene npm workspaces**; con 3 paquetes + 1 app no compensa la complejidad. Revisar si el nº de apps/paquetes crece.

> La app RN vive ahora en `apps/mobile/`; `ios/` quedó reescrito pero SIN compilar (no hay Xcode en Windows — verificar en Mac).

---

## Fase 4 — GeckoView en Android (motor propio)

Objetivo: reemplazar `react-native-webview` (que en Android es el System WebView) por GeckoView, que da Enhanced Tracking Protection y anti-fingerprinting a nivel de motor.

- [x] Añadir dependencia `org.mozilla.geckoview:geckoview`.
- [x] `GeckoRuntimeProvider.kt` (init de `GeckoRuntime` con ETP `STRICT` + `AntiTracking.STRICT`, que incluye FINGERPRINTING + CRYPTOMINING).
- [x] Puente RN + `ViewManager` para renderizar GeckoView desde JS (render verificado en API 34).
- [x] Portar la inyección de `@spider/privacy-js` al ciclo de vida de GeckoView (WebExtension `world:MAIN`; spoofing verificado en browserleaks).
- [x] Definir qué defensas del bundle JS son redundantes con las nativas de Gecko (solo el blocker de peticiones; ver `docs/GECKOVIEW.md`).

**Estado:** implementación completa y verificada (rama `feat/gecko-engine`).
**Resuelto como dos ediciones (product flavors):** el build `standard` (WebView,
~21 MB) no enlaza GeckoView y va a Play + F-Droid (cumple los 80 MB); la edición
`gecko` (~92 MB/ABI) enlaza el motor y se distribuye **fuera de Play** (F-Droid /
APK directo) como paquete aparte (`applicationIdSuffix ".gecko"`) que el usuario
elige. GeckoView es `geckoImplementation` (solo el flavor gecko paga el tamaño);
el Kotlin de Gecko vive en `src/gecko/`. El motor se selecciona en runtime según
lo compilado. Detalles y builds en `docs/GECKOVIEW.md`.

---

## Fase 5 — Red privada (Tor vía Orbot primero, WireGuard después)

Objetivo: hacer real la sección "Red privada" (hoy un selector `Directa / Orbot / Mullvad`). El selector unificado y sus opciones viven en `@spider/network` (`NETWORK_MODE_LIST`, `ORBOT`), consumidos por `SettingsScreen`.

> **Decisión de arquitectura:** en vez de arrancar por un `VpnService` propio con WireGuard (semanas de código nativo), se integra primero **Orbot** (Guardian Project). Orbot ya es una app con su propio `VpnService` que enruta *todo* el tráfico del dispositivo por Tor; nosotros solo lo detectamos, lo lanzamos por intent y reflejamos el estado. No configuramos proxy dentro del WebView (react-native-webview no expone SOCKS por-app): cuando la VPN de Orbot está activa, el tráfico del WebView ya va tunelizado a nivel OS.

### 5a. Orbot / Tor (Android) — vía pragmática
- [x] Modelo de datos en `@spider/network`: `NetworkModeId`, `NETWORK_MODE_LIST`, constantes `ORBOT` (package id, intent START, puertos SOCKS/HTTP, URL de instalación).
- [x] `settingsStore`: `networkMode` + `setNetworkMode` (reemplaza el antiguo booleano `vpnEnabled`).
- [x] Puente nativo `android/.../orbot/OrbotModule.kt` (+ `OrbotPackage`, registrado en `MainApplication`): `isInstalled`, `start`, `openApp`, `openInstall`.
- [x] Manifest: `<queries>` para visibilidad del paquete `org.torproject.android` (Android 11+).
- [x] Wrapper JS `src/native/orbot.ts` (fallback a `Linking` en iOS / sin bridge).
- [x] UI: selector "Red privada" en `SettingsScreen`; al elegir Orbot se lanza Tor o se ofrece instalarlo.
- [x] **Verificar en build nativo** ✔ (2026-07-07, OPPO CPH2747 / Android 16, edición gecko v0.0.14): Orbot detectado e instalado desde el flujo, consentimiento VPN, VPN de Tor device-wide, y salida por Tor confirmada por API (`{"IsTor":true}`) y visualmente en `check.torproject.org` ("Congratulations. This browser is configured to use Tor.").
- [x] **Estado en vivo** ✔ (2026-07-07): reflejar el estado REAL del túnel en el chip/selector. Se probó el broadcast legacy de Orbot (`intent.action.STATUS`), pero **Orbot 17.x ya no lo emite a apps de terceros** — así que la señal fiable es la **detección del transporte VPN activo** vía `ConnectivityManager.NetworkCallback` (independiente de la versión de Orbot). `OrbotModule` emite `orbotStatus` → `networkStatusStore` → el chip muestra "Conectando…/Conectado/Sin conectar". Verificado en dispositivo (standard v0.0.15): la fila de Orbot pasa a "Conectado" con el túnel arriba y "Sin conectar" al caer.
- [ ] **iOS**: Orbot iOS no ofrece handoff app-a-app equivalente; queda como **solo-Android** por ahora (evaluar `NEVPNManager`/perfil en el futuro, requiere Mac + entitlement).

### 5b. WireGuard genérico (import de config) ✔ code-complete
Decisión (2026-07-07): en vez de atar la app a la API de pago de Mullvad, se implementó un **túnel WireGuard genérico** que importa un `.conf` estándar (Mullvad o cualquier proveedor). La app no embebe ninguna cuenta.
- [x] `wireguard-android` (`com.wireguard.android:tunnel`) integrado; su `GoBackend` aporta el `VpnService` real (declarado en el manifest con FGS special-use). +~1 MB en standard (12.8 MB, dentro de los 80).
- [x] `WireGuardModule.kt` (+ `WireGuardPackage`, registrado en `MainApplication`): `importConfig` (parsea `Config.parse`), `connect` (consentimiento VPN vía `VpnService.prepare` + `startActivityForResult`), `disconnect`, `getStatus`; emite `wireguardState`. Backend en hilo de fondo.
- [x] Wrapper JS `src/native/wireguard.ts` + `WireGuardSheet` (pegar `.conf` → importar/conectar/desconectar) + opción `mullvad` del selector cableada (abre la hoja vía `networkStatusStore.wgSheetOpen`). Relabelada a "WireGuard".
- [x] **Verificado en dispositivo** (parcial, 2026-07-07): la hoja abre, el módulo nativo carga sin crash, y el parseo real de `Config.parse` funciona end-to-end (config inválida → excepción → alert "Configuración inválida"). **Pendiente de config real**: el `connect` (bring-up del túnel + salida por el túnel) no se ha ejercitado por falta de un `.conf` WireGuard válido.
- [ ] iOS: `NEPacketTunnelProvider` (Network Extension, requiere Mac + entitlement de pago). **Solo-Android** por ahora.

---

## Deuda técnica transversal (atacar en cualquier fase)

- [x] ~~Conflicto de peer deps `react-native-get-random-values@^2` (exige RN ≥0.81)~~ → **resuelto**: dependencia eliminada; `src/utils/uuid.ts` ya no la necesita (usa `crypto.getRandomValues` si existe, si no fallback `Math.random`). Revisar si `npm install` aún necesita `--legacy-peer-deps` por otras deps.
- [x] ~~`.env` no consumido por nadie~~ → **hecho**: `react-native-dotenv` (`@env`) + `src/config/env.ts` exponen `FEATURES.privacyJs`/`FEATURES.contentBlocking` (kill switches de build) y `DEFAULT_DOH_PROVIDER_ID` (semilla del store). `.env` alineado con el código real (fuera `GECKO_VERSION`; `DOH_PROVIDER` url → `DEFAULT_DOH_PROVIDER` id).
- [x] ~~Sin manejo de errores de carga en el WebView~~ → **hecho**: `HardenedWebView` emite `onLoadError` (`onError`/`onHttpError`) + `onLoadStart`; `BrowserScreen` muestra un overlay temático con botón Reintentar.
- [x] ~~Tab previews son iconos, no thumbnails reales~~ → **hecho**: `react-native-view-shot` captura la página al abrir el switcher (`captureAndOpenTabs` en `BrowserScreen`); en Android se voltea `androidLayerType` a `software` un instante para que el WebView no salga en blanco. La imagen (`preview` data-uri) vive **en memoria** en `tabStore` (NO persistida — no se escriben snapshots a disco). `TabsScreen` la muestra con fallback al icono. Requiere rebuild nativo (`npm run android`); si la captura falla en algún dispositivo, cae al icono sin romper.
- [x] ~~Sin gestión del back físico de Android~~ → **hecho**: `BackHandler` en `App.tsx` (cierra Settings/Tabs) y en `BrowserScreen` (cierra modales → navega atrás en la web → sale).
- [x] ~~Tokens de diseño hardcodeados en cada `StyleSheet`~~ → **HECHO**: paleta única en `src/theme/theme.ts` (`darkColors`/`lightColors` + surfaces), consumida vía `useTheme()` (`ThemeContext`). **Tema claro/oscuro** con selector Sistema/Claro/Oscuro en Ajustes (`themeMode` persistido junto al idioma). Las pantallas construyen su `StyleSheet` con `makeStyles(colors, surfaces)`. (Pendiente menor: extraer a `@spider/ui` cuando se monte el monorepo de UI.)

---

## Orden recomendado

**1 → 2 → 4 → 5**, con **3** (mover la app a `apps/mobile/`) intercalada justo antes de la Fase 4, cuando aparezca el primer código nativo compartido. La Fase 1 es la de mayor retorno inmediato: elimina la brecha entre "lo que la UI promete" y "lo que la app hace".
