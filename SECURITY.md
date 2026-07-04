# Política de seguridad

## Reportar una vulnerabilidad

Si encuentras un fallo de seguridad en Spider Privacy Browser, te agradezco que lo
reportes de forma responsable antes de hacerlo público.

Escríbeme a través de una de estas vías:

- Abriendo un aviso privado de seguridad en GitHub (pestaña **Security → Report a
  vulnerability** del repositorio).
- Por correo, a la dirección de contacto de Redder Labs.

Por favor incluye lo que puedas de esto:

- Una descripción del problema y por qué crees que es un riesgo.
- Los pasos para reproducirlo (versión de la app, dispositivo y Android).
- Si es posible, una prueba de concepto.

Intento responder en pocos días. Te mantendré al tanto mientras lo investigo y lo
corrijo, y si quieres te acredito cuando publique el arreglo.

## Qué esperar

- Trabajo en solitario y en mis horas, así que los tiempos son los de una persona,
  no los de un equipo. Aun así, los fallos de seguridad tienen prioridad.
- Te pido que no divulgues el fallo públicamente hasta que haya una versión
  corregida disponible.

## Alcance

Cuenta como problema de seguridad cualquier cosa que rompa las garantías del
navegador: fugas que permitan identificar al usuario, saltarse el blindaje contra
fingerprinting, filtrar historial o datos de sesión que deberían quedarse en
memoria, o exponer tráfico que debería ir cifrado.

## Modelo de amenaza

Prefiero ser claro con lo que la app hace y lo que no, antes que prometer un
anonimato que no da. Para comprobar por tu cuenta cada punto de aquí, mira
[`docs/AUDIT.md`](docs/AUDIT.md).

### Qué protege

- **Sin telemetría.** No hay analítica, ni crash reporting, ni cuentas, ni
  identificadores, ni servidores propios a los que enviar nada. Las dependencias
  no incluyen Google Play Services ni Firebase.
- **Incógnito por defecto.** Historial, cookies, caché y pestañas no se guardan y
  se descartan al cerrar. Lo único que sobrevive a un cierre son **dos preferencias
  de interfaz: idioma y tema** (`partialize` en `src/store/settingsStore.ts`). Todo
  lo demás vuelve a sus valores por defecto en cada arranque.
- **WebView endurecido** (`src/components/HardenedWebView.tsx`): `incognito`,
  sin caché, `mixedContentMode="never"`, cookies de terceros desactivables y un
  User-Agent coherente con el `navigator.*` inyectado.
- **Anti-fingerprint** (`@spider/privacy-js`, inyectado antes de cargar la página):
  ruido de canvas por sesión, spoof de WebGL, coherencia de `navigator`, bloqueo de
  enumeración de fuentes y zona horaria a UTC.
- **Bloqueo de rastreadores in-page** contra ~113 dominios (`@spider/network`), más
  bloqueo de cookies de terceros y borrado al cerrar.
- **DNS cifrado** opcional: Private DNS (DoT) del sistema y una VPN solo-DNS (DoH).
- **Permisos mínimos**: `INTERNET` y los de la VPN de DNS. No pide ubicación,
  contactos, almacenamiento, cámara ni micrófono.

### Qué NO protege (límites honestos)

- **No oculta tu IP ni anonimiza el tráfico.** La navegación sale directa por tu red
  salvo que actives **Orbot (Tor)** (solo Android, aún por verificar en build
  nativo). La opción **Mullvad WireGuard** es un "próximamente": no está implementada.
- **La VPN de DNS es solo-DNS.** Cifra las consultas DNS, pero no tuneliza el resto
  del tráfico ni oculta tu IP.
- **El bloqueo de rastreadores tiene techo.** Es in-page (envuelve `fetch`/`XHR`/
  `sendBeacon`), no intercepción nativa de subrecursos. El bloqueo nativo llega en
  la Fase 2.
- **El motor es el WebView del sistema** (Chromium), no un motor propio endurecido.
  Las defensas anti-fingerprint suben el coste de identificarte, pero no dan
  anonimato perfecto ni cierran fugas a nivel de motor (GeckoView: Fase 4).
- **Sin auditoría externa.** El código es abierto y auditable, pero no ha pasado una
  auditoría de seguridad independiente.
- **iOS no está implementado**: hoy esto es Android.

### Supuestos

- El dispositivo y el sistema operativo no están comprometidos (sin malware, sin root
  hostil).
- El WebView/Chromium del sistema es de confianza para renderizar y para TLS.
- El adversario que se considera son rastreadores comerciales, redes publicitarias y
  observadores de red pasivos (tu ISP viendo consultas DNS en claro). **No** se
  defiende frente a un atacante global activo, exploits de día cero del motor, ni
  acceso físico o a nivel de sistema.
