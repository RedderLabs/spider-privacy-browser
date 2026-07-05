# Spider Privacy Browser

Un navegador móvil centrado en la privacidad, para Android. La idea es sencilla:
que puedas navegar sin dejar un rastro que te identifique y sin que un puñado de
rastreadores publicitarios te sigan de una web a otra. Todo el trabajo de
protección ocurre en el propio teléfono; nada de tu navegación se recopila ni se
envía a ningún servidor.

Está inspirado en el enfoque de Mullvad Browser (endurecer el navegador para que
todos los usuarios se parezcan entre sí), llevado a un navegador móvil ligero.

## Qué hace

- **Protección contra fingerprinting.** Antes de que cargue cada página se
  inyecta un pequeño script que añade ruido al canvas, enmascara la GPU (WebGL),
  bloquea la enumeración de fuentes, normaliza la zona horaria a UTC y limpia las
  huellas del `navigator`. Cada defensa se puede activar o desactivar.
- **Bloqueo de rastreadores.** Las peticiones a dominios conocidos de tracking se
  cortan antes de salir del dispositivo.
- **DNS cifrado.** Puedes forzar un resolutor DoH/DoT (Cloudflare, Mullvad, Quad9…)
  para que tus consultas de DNS no viajen en claro.
- **Red privada opcional.** Enruta el tráfico por Tor delegando en Orbot si lo
  tienes instalado (no incluimos ni ejecutamos nuestro propio Tor).
- **Incógnito de verdad.** Las pestañas viven solo en memoria. Al cerrar la app no
  queda historial, cookies ni sesión: lo único que se recuerda entre arranques es
  el idioma.
- **Ajustes por sitio.** Puedes relajar o reforzar el blindaje para un dominio
  concreto cuando una web se rompe o cuando quieres máxima protección.

## Requisitos

- Node.js 18 o superior
- El entorno de desarrollo de React Native para Android (JDK 17, Android SDK)

## Poner en marcha

El repo es un monorepo npm: la app React Native vive en `apps/mobile/` y el
código compartido en `packages/*`. Los comandos de abajo se lanzan desde la raíz
(los scripts delegan en el workspace `apps/mobile`).

```bash
npm install
npm start          # arranca Metro
npm run android    # compila e instala en un dispositivo o emulador
```

Para generar un APK de release firmado (usa la clave de debug por defecto; para
publicar hay que configurar una clave propia):

```bash
cd apps/mobile/android
./gradlew assembleRelease
```

El APK queda en `apps/mobile/android/app/build/outputs/apk/release/`.

## Cómo está organizado

- `App.tsx` — punto de entrada; cambia entre las pantallas (inicio, pestañas,
  ajustes, acerca de) sin librería de navegación.
- `src/privacy/` — el corazón de la app: construye el script de endurecimiento a
  partir de los ajustes activos.
- `src/components/HardenedWebView.tsx` — el WebView reforzado que inyecta ese
  script y bloquea rastreadores.
- `src/store/` — estado con Zustand (pestañas en memoria y ajustes).
- `packages/` — dos paquetes internos reutilizables: `@spider/privacy-js` (la
  lógica de endurecimiento, sin dependencias de la app) y `@spider/network`
  (proveedores de DNS y modos de red).
- `android/` — proyecto nativo, incluyendo los módulos de DNS privado, VPN de DoH
  y el puente con Orbot.

## Privacidad

La app no tiene cuentas, ni telemetría, ni analítica, ni SDKs de terceros. No
depende de los servicios de Google Play. No recopila absolutamente nada: no hay a
dónde enviarlo porque no existe ese servidor. Puedes comprobarlo revisando el
código.

## Tests

```bash
npm test
```

## Licencia

Publicado bajo la [GNU Affero General Public License v3.0](LICENSE). Puedes usarlo,
estudiarlo, modificarlo y redistribuirlo; si lo ofreces como servicio, debes
compartir tus cambios bajo la misma licencia.
