# Cómo auditar Spider Privacy Browser

No hace falta creerte lo que dice el README ni [`SECURITY.md`](../SECURITY.md). Aquí tienes cómo **comprobar por tu cuenta** cada afirmación, con comandos concretos. La app es AGPL-3.0-or-later y se construye desde el fuente.

Todo lo de aquí se ha pensado para un portátil normal con Node, el SDK de Android y `adb`. Los comandos de `grep` funcionan igual en Linux/macOS y en Git Bash de Windows.

## 1. Construir desde el fuente

```bash
npm ci
cd android && ./gradlew assembleRelease     # en Windows: .\gradlew.bat assembleRelease
```

El APK sale en `android/app/build/outputs/apk/release/`. F-Droid hace exactamente esto en un entorno limpio (ver [`FDROID.md`](FDROID.md)), así que el binario es reproducible desde este código.

## 2. Que no hay telemetría ni SDKs propietarios

```bash
# No debe aparecer NADA de esto en el código ni en las dependencias:
grep -rniE "firebase|google-services|gms|crashlytics|analytics|amplitude|mixpanel|sentry" \
  package.json packages/ src/ android/app/src android/app/build.gradle
```

Y revisa las dependencias en `package.json`: son una lista corta (React Native, WebView, Zustand, AsyncStorage, safe-area, screens, view-shot). No hay ninguna librería de analítica.

## 3. Los permisos que pide

```bash
grep -nE "uses-permission|<queries" android/app/src/main/AndroidManifest.xml
# o sobre el APK ya construido:
aapt dump permissions android/app/build/outputs/apk/release/app-release.apk
```

Deberías ver solo `INTERNET`, los de servicio en primer plano para la VPN de DNS
(`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE`, `POST_NOTIFICATIONS`) y la
visibilidad del paquete de Orbot. **No** hay ubicación, contactos, almacenamiento,
cámara ni micrófono.

## 4. Que es incógnito de verdad (no persiste nada)

La regla vive en `src/store/settingsStore.ts`, en `partialize`: lo único que se
escribe a disco (`AsyncStorage`) son `language` y `themeMode`.

```bash
grep -n "partialize" -A4 src/store/settingsStore.ts
```

Compruébalo en caliente, con la app instalada:

```bash
# Navega un rato, cierra la app del todo, y vuelca la BD de AsyncStorage
# (SQLite, tabla catalystLocalStorage) para ver qué se guardó de verdad:
adb shell run-as com.spiderprivacybrowser \
  sqlite3 databases/RKStorage "select key from catalystLocalStorage;" 2>/dev/null
```

Deberían salir solo las claves de idioma y tema (`spider-settings` con `language` y
`themeMode`): ni historial, ni cookies, ni URLs, ni pestañas.

## 5. Qué se inyecta en cada página (anti-fingerprint + bloqueo)

El bundle inyectado se ensambla en `packages/privacy-js/src/index.ts`
(`buildPrivacyBundle`) a partir de defensas individuales y legibles: `canvas.ts`,
`webgl.ts`, `navigator.ts`, `fonts.ts`, `timezone.ts`, `blocker.ts`,
`autoconsent.ts`. Son JS puro, sin dependencias del resto de la app, así que puedes
leerlas de principio a fin.

La lista de rastreadores está en `packages/network/src/blocklist.ts`
(`TRACKER_DOMAINS`, ~113 dominios).

Para verlo en vivo, abre una página con rastreadores conocidos y toca el badge del
escudo: se abre el panel de dominios bloqueados (por pestaña). O intercepta el
tráfico con un proxy:

```bash
# Con mitmproxy en tu red y el certificado instalado en el emulador:
mitmproxy
# Navega y confirma que los dominios de la blocklist no reciben peticiones.
```

## 6. El endurecimiento del WebView

```bash
grep -nE "incognito|cacheEnabled|mixedContentMode|thirdPartyCookies|userAgent" \
  src/components/HardenedWebView.tsx
```

Debes ver `incognito`, `cacheEnabled={false}`, `mixedContentMode="never"`, las
cookies de terceros atadas al toggle, y un `userAgent` fijo coherente con el
`navigator` inyectado.

## 7. El DNS cifrado

- **Private DNS (DoT)**: actívalo en Ajustes; la cabecera debe pasar a "DNS cifrado
  activo". Confírmalo desde fuera:

  ```bash
  adb shell dumpsys connectivity | grep -i privatedns
  # UsePrivateDns: true, ValidatedPrivateDnsAddresses: [...]
  ```

- **VPN solo-DNS (DoH)**: al activarla, Android pide consentimiento de VPN y aparece
  el icono de llave. Verifica que es un servicio en primer plano y solo-DNS:

  ```bash
  adb shell dumpsys activity services com.spiderprivacybrowser | grep -iE "vpn|foreground"
  ```

  Recuerda: esto **solo** cifra las consultas DNS; no tuneliza el resto del tráfico
  (ver [`SECURITY.md`](../SECURITY.md)).

## 8. Los tests, el lint y los tipos

```bash
npm test              # Jest (privacyBundle, blocklist, requestBlocker, siteExceptions, i18n, tabStore, ...)
npm run lint          # ESLint, 0 errores
npx tsc --noEmit      # tipos
```

## 9. La licencia

```bash
head -5 LICENSE       # GNU Affero General Public License v3
```

---

Si algo de esto no cuadra con lo que ves, es un hallazgo legítimo: cuéntalo en el
[issue tracker](https://github.com/RedderLabs/spider-privacy-browser/issues) (o de
forma privada si es sensible, según [`SECURITY.md`](../SECURITY.md)).
