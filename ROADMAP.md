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
| Red privada (selector) | `[~]` | Selector unificado `Directa / Orbot (Tor) / Mullvad WireGuard` en `@spider/network` (`NETWORK_MODE_LIST`) |
| Orbot (Tor) | `[~]` | Puente nativo `OrbotModule.kt` (detecta/lanza Orbot vía intent). Falta verificar en build nativo |
| Excepciones por sitio | `[x]` | **Task 9 hecho**: override por dominio `off`/`strict` en `settingsStore` (`siteExceptions` + `resolveHardening`, persistido); precedencia sobre el master global; hoja por-sitio al tocar el badge de escudo; recarga al cambiar |
| VPN WireGuard | `[ ]` | Mullvad WireGuard marcado "próximamente"; sin `VpnService` propio todavía |
| GeckoView | `[ ]` | No existe (solo `MainActivity`/`MainApplication` por defecto) |
| Monorepo (mover app a `apps/mobile/`) | `[ ]` | Pendiente; se hace en Fase 3 cuando aparezca código nativo compartido |
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
5. **Auditabilidad** (pediste): crear `LICENSE`, `SECURITY.md` (threat model honesto), `AUDIT.md` (cómo verificar).

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

- [ ] **iOS — `WKContentRuleList`**: crear `ios/.../ContentRules.swift`, empaquetar reglas JSON (nuevo `packages/content-blocking/`) y compilarlas con `WKContentRuleListStore`. Requiere puente nativo para exponerlo a RN.
- [ ] **Android — interceptación de recursos**: `shouldInterceptRequest` en un WebViewClient custom (bridge nativo) o adoptar GeckoView (ver Fase 4) para ETP nativo.
- [ ] **Filter lists**: pipeline para convertir EasyList/AdGuard al formato `WKContentRuleList`. Documentar cómo se actualizan.
- [ ] **Conectar el contador real** (Fase 1) a estos bloqueos nativos.

---

## Fase 3 — Completar el monorepo (mover la app a `apps/mobile/`)

Objetivo: terminar la migración iniciada. Los paquetes ya son workspaces; falta mover la app nativa cuando el código nativo compartido lo justifique.

- [x] Workspaces npm activos (`packages/*`) con `@spider/privacy-js` y `@spider/network`.
- [x] `src/privacy/bundle.ts` reducido a adaptador que consume `@spider/privacy-js` (fuente única).
- [x] Lista DoH unificada en `@spider/network` y consumida por `SettingsScreen`.
- [x] `metro.config.js` (`watchFolders`) y `tsconfig.json` (`paths`) configurados para el workspace.
- [ ] Mover la app RN a `apps/mobile/` (⚠️ rompe rutas de Gradle/Xcode/Metro — hacer con builds nativos disponibles para probar).
- [ ] Añadir `apps/*` a `workspaces` en el `package.json` raíz.
- [ ] Extraer las reglas de content-blocking a `packages/content-blocking/`.
- [ ] (Opcional) Evaluar pnpm+Turborepo si el número de paquetes crece; hoy el repo usa **npm** y es suficiente.

> No mover la app antes: sin código nativo compartido, el movimiento físico solo añade fricción y riesgo de romper los builds.

---

## Fase 4 — GeckoView en Android (motor propio)

Objetivo: reemplazar `react-native-webview` (que en Android es el System WebView) por GeckoView, que da Enhanced Tracking Protection y anti-fingerprinting a nivel de motor.

- [ ] Añadir dependencia `org.mozilla.geckoview:geckoview-default`.
- [ ] Crear `GeckoViewModule.kt` (init de `GeckoRuntime` con `ContentBlocking` STRICT + FINGERPRINTING + CRYPTOMINING).
- [ ] Puente RN + `ViewManager` para renderizar GeckoView desde JS.
- [ ] Portar la inyección de `@spider/privacy-js` al ciclo de vida de GeckoView.
- [ ] Definir qué defensas del bundle JS son redundantes con las nativas de Gecko.

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
- [ ] **Verificar en build nativo** (dispositivo con/sin Orbot): consentimiento VPN, arranque de Tor, y comprobar salida por Tor (p. ej. `check.torproject.org`).
- [ ] **Estado en vivo**: escuchar el broadcast de estado de Orbot (`extra STATUS`: ON/OFF/STARTING) y reflejarlo en el badge de red (hoy el selector no lee el estado real de la VPN).
- [ ] **iOS**: Orbot iOS no ofrece handoff app-a-app equivalente; evaluar `NEVPNManager`/perfil o dejar Tor como solo-Android.

### 5b. Mullvad WireGuard (más adelante)
- [ ] `VpnServiceModule.kt` extendiendo `android.net.VpnService`.
- [ ] Integrar `wireguard-android` (túnel full: `0.0.0.0/0`, DNS Mullvad).
- [ ] Conectar la opción `mullvad` del selector (hoy "próximamente") al servicio.
- [ ] iOS: `NEPacketTunnelProvider` (Network Extension, requiere entitlement de pago).

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
