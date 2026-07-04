# Content blocking (Fase 2)

Spider bloquea rastreadores y anuncios a nivel de petición, no solo en las
navegaciones top-level. Hay tres capas, todas alimentadas por la misma lista:

| Capa | Dónde | Qué corta |
| --- | --- | --- |
| Bloqueador JS in-page | `@spider/privacy-js` (inyectado en cada página) | `fetch` / `XHR` / `sendBeacon` a hosts rastreadores |
| Nativo Android | `shouldInterceptRequest` en el `RNCWebViewClient` parcheado → módulo `NativeBlocklist` | **cualquier** subrecurso (imágenes, scripts, iframes) de un host rastreador, antes de salir a la red |
| Nativo iOS | `WKContentRuleList` compilado por `SpiderContentRuleStore` (dentro del pod de `react-native-webview`) e instalado en cada `WKWebView` | igual que Android, aplicado por WebKit |

Las navegaciones de marco principal nunca se bloquean (no quieres que la barra de
direcciones quede muerta); solo subrecursos.

## El pipeline de filter lists

`packages/content-blocking/` convierte reglas en sintaxis **EasyList / AdGuard**
en los dos artefactos que consume la app:

- `BLOCKED_HOSTS: string[]` — lista de hosts para el bloqueador nativo de Android
  (se empuja por el puente `NativeBlocklist`) y para el matcher in-page.
- `WK_CONTENT_RULES_JSON: string` — un `WKContentRuleList` JSON para iOS, que el
  módulo nativo compila con `WKContentRuleListStore`.

Ambos se calculan una sola vez al cargar el módulo (parsear la lista es
microsegundos) y se memoizan; el código de la app solo importa los valores ya
listos desde `@spider/content-blocking`.

### Fuentes

1. **`@spider/network` → `TRACKER_DOMAINS`**: la semilla curada a mano (hosts +
   algunas rutas). Las entradas con ruta (`facebook.com/tr`) solo las usa el
   matcher por substring; el pipeline las descarta para la lista por-host.
2. **`packages/content-blocking/src/spiderFilters.ts` → `SPIDER_FILTERS`**: la
   lista propia del proyecto, editable a mano, en sintaxis de filtros.

El pipeline hace la unión, quita lo que una excepción `@@` permita, deduplica y
ordena.

### Sintaxis soportada

Solo reglas de **red** (las cosméticas `##selector` se ignoran a propósito):

```
||example.com^                bloquea example.com y subdominios
||example.com^$third-party     igual, solo como tercera parte
||example.com/path             se descarta la ruta; se bloquea el host
example.com                    host pelado
0.0.0.0 example.com            línea estilo hosts-file
@@||example.com^               excepción: el host se pone en allow-list
! comentario  /  # comentario  se ignoran
```

Las reglas con opciones que no se pueden representar como bloqueo por host
(`domain=`, `csp=`, `redirect=`) se saltan para no sobre-bloquear.

## Cómo actualizar / ampliar la lista

- **Editar a mano**: añade reglas a `packages/content-blocking/src/spiderFilters.ts`.
  No hay paso de build — la app recalcula `BLOCKED_HOSTS` y `WK_CONTENT_RULES_JSON`
  al arrancar.
- **Traer listas upstream** (EasyList / EasyPrivacy / AdGuard Base): copia la
  sección de reglas de red al `String.raw` de `spiderFilters.ts` (o crea otro
  módulo string y añádelo a la unión en `src/index.ts`). El parser ignora
  cabeceras, comentarios y reglas cosméticas, así que puedes pegar bloques
  grandes tal cual. Verifica con `npm test` (hay tests del parser y de los
  artefactos) y, en Android, con un `console`/log temporal en `NativeBlocklist`.

## Notas de plataforma

- **Android**: el patrón está desacoplado — el patch de `react-native-webview`
  expone un `SubresourceBlocker` (holder estático en la librería) que el app
  registra en runtime; la librería nunca referencia clases del app. Verificado en
  emulador (bloquea subrecursos reales, matching de subdominios OK).
- **iOS**: `SpiderContentRuleStore` vive **dentro del pod** de `react-native-webview`
  (añadido por `patch-package`) para que el `RNCWebViewImpl` parcheado pueda
  registrar cada `WKUserContentController`; el módulo RN del app
  (`ios/SpiderPrivacyBrowser/SpiderContentBlocker.m`) lo alimenta desde JS. La
  compilación del `WKContentRuleList` es asíncrona: el store la instala en las
  webviews vivas en cuanto termina y la reaplica al alternar el escudo.
  **Paso manual pendiente**: `SpiderContentBlocker.m` debe añadirse al target de
  Xcode `SpiderPrivacyBrowser` (la plantilla RN lista los fuentes en
  `project.pbxproj`, no por carpeta). Al ser Objective-C no necesita bridging
  header. Esta capa está escrita pero **sin verificar** — requiere un build en
  macOS con Xcode.
