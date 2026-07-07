# Publicar en F-Droid

Guía para dar de alta **Spider Privacy Browser** (`com.spiderprivacybrowser`) en F-Droid.

A diferencia de Google Play, en F-Droid no se sube un binario: publicas el código y **los servidores de F-Droid compilan la app desde el fuente** y la firman. Tú solo aportas el fuente FOSS (ya lo es: AGPL-3.0, sin GMS/Firebase) y una receta de build.

## Requisitos previos

- Cuenta en **GitLab.com** (F-Droid vive ahí, no en GitHub).
- `git`.
- Para probar el build en local: **Linux, WSL2 o Docker**. En Windows puro `fdroid build` no corre.

## Estado del repo (ya listo)

- Licencia FLOSS: AGPL-3.0-or-later (`LICENSE`).
- Sin GMS/Firebase/analytics.
- Metadata fastlane (textos, changelogs, icono, capturas) en `fastlane/metadata/android/{en-US,es-ES}/`.
- La app vive en `main` (rama canónica) con dos **product flavors**: `standard` (motor
  WebView del sistema, ~28 MB universal — el que va a F-Droid) y `gecko` (GeckoView, ~92 MB/ABI,
  fuera de Play/F-Droid por tamaño). F-Droid compila **solo el flavor `standard`**.
- Tag de release **`v0.0.16`** apuntando al commit con `versionName 0.0.16` / `versionCode 16`.

## Paso 1 — Fork + clone de `fdroiddata`

En GitLab, pulsa **Fork** en `gitlab.com/fdroid/fdroiddata`. Luego:

```bash
git clone https://gitlab.com/TU_USUARIO/fdroiddata.git
cd fdroiddata
git checkout -b com.spiderprivacybrowser
```

## Paso 2 — Crear `metadata/com.spiderprivacybrowser.yml`

No lleva descripción: F-Droid la toma de `fastlane/metadata/.../full_description.txt` del repo de GitHub.

```yaml
Categories:
  - Internet
License: AGPL-3.0-or-later
AuthorName: Redder Labs
SourceCode: https://github.com/RedderLabs/spider-privacy-browser
IssueTracker: https://github.com/RedderLabs/spider-privacy-browser/issues

AutoName: Spider Privacy Browser

RepoType: git
Repo: https://github.com/RedderLabs/spider-privacy-browser.git

Builds:
  - versionName: 0.0.16
    versionCode: 16
    commit: v0.0.16
    subdir: apps/mobile/android/app
    sudo:
      - sysctl fs.inotify.max_user_watches=524288 || true
      - curl -Lo node.tar.gz https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.gz
      - echo "259e5a8bf2e15ecece65bd2a47153262eda71c0b2c9700d5e703ce4951572784  node.tar.gz" | sha256sum -c -
      - tar xzf node.tar.gz --strip-components=1 -C /usr/local/
      - npm -g install npm
    ndk: 27.1.12297006
    init:
      - cd ../../../.. && npm ci
    prebuild:
      - echo "fdroidUniversal=true" >> ../gradle.properties
    gradle:
      - standard
    output: build/outputs/apk/standard/release/app-standard-release.apk
    scandelete:
      - node_modules

AutoUpdateMode: Version v%v
UpdateCheckMode: Tags
CurrentVersion: 0.0.16
CurrentVersionCode: 16
```

Qué hace cada parte:

- **`sudo`**: instala Node como root (la imagen base de F-Droid no trae Node reciente). El `sha256sum -c` verifica el binario.
- **`ndk`**: la versión que usa el proyecto (`apps/mobile/android/build.gradle`).
- **`init`**: `npm ci` desde la raíz del repo (`cd ../../../..` porque `subdir` es `apps/mobile/android/app`). La app es un monorepo npm: la raíz instala los workspaces (`apps/*` + `packages/*`). Nota: los tags anteriores a la migración a monorepo (≤ `v0.0.7`) tenían la app en la raíz, así que un build de esos tags usaría `subdir: android/app` y `cd ../..`.
- **`prebuild`**: activa la propiedad `fdroidUniversal` (la escribe en `apps/mobile/android/gradle.properties`, un nivel por encima del `subdir`). Con ella, `app/build.gradle` **desactiva las ABI splits** y emite un único APK universal con las 4 ABIs y el `versionCode` base `16` (sin la propiedad, un build normal saca 4 APKs por-ABI con codes 151-154, que no encajan en una entrada `Builds` única).
- **`gradle: [standard]`**: compila el flavor `standard` → `assembleStandardRelease`. NO se compila `gecko` (excede el presupuesto de tamaño; va solo por APK directa / GitHub Releases).
- **`output`**: el APK universal del flavor standard. Verificado en local (`-PfdroidUniversal`): `app-standard-release.apk`, ~28 MB, `versionCode=16`, `native-code: arm64-v8a armeabi-v7a x86 x86_64`.
- **`scandelete: node_modules`**: evita que el escáner de F-Droid recorra esa carpeta buscando binarios.
- **No hay que quitar nada en `prebuild`**: la app ya es FOSS-limpia (nada de GMS/Firebase).

## Paso 3 — Validar en local

Instala las herramientas y corre lo barato primero:

```bash
pip install fdroidserver
fdroid lint com.spiderprivacybrowser
fdroid rewritemeta com.spiderprivacybrowser   # normaliza el formato del yml
```

El build real, con la imagen oficial en Docker:

```bash
docker run --rm -itu vagrant --entrypoint bash \
  -v "$PWD":/repo registry.gitlab.com/fdroid/fdroidserver:buildserver \
  -c "cd /repo && fdroid build -v -l com.spiderprivacybrowser"
```

Si montar Docker en Windows se hace cuesta arriba, puedes **saltarte el build local y dejar que lo haga el CI del Merge Request** (Paso 4). Es un flujo habitual.

## Paso 4 — Commit + Merge Request

```bash
git add metadata/com.spiderprivacybrowser.yml
git commit -m "New app: Spider Privacy Browser"
git push origin com.spiderprivacybrowser
```

Abre el MR desde tu fork hacia `fdroid/fdroiddata`. El **pipeline del MR intenta el build**; si falla, lees el log, ajustas el `.yml` y vuelves a pushear a la misma rama (el MR se actualiza solo). Un maintainer revisa y mergea. Suele tardar ~24-48 h en aparecer tras el merge.

Alternativa más lenta: abrir un **RFP** (Request For Packaging) en `gitlab.com/fdroid/rfp`.

## Puntos de riesgo (donde suele fallar el primer build)

1. **New Architecture** (`newArchEnabled=true` en `android/gradle.properties`): activa codegen C++ nativo, lo más propenso a romper en el entorno de F-Droid. Si muere ahí, la salida más simple es desactivarla solo para F-Droid con un `sed` en `prebuild`, pero conviene probar tal cual primero.
2. **NDK `27.1.12297006`**: tiene que estar disponible en el buildserver; si no, se ajusta a la que tengan.
3. **`output`**: si `fdroid build` no encuentra el APK en esa ruta, mira dónde lo dejó `assembleRelease` y corrige la línea.
4. **Node 20 vs RN 0.79**: compatibles, pero si algún módulo nativo se queja, sube/baja la versión de Node (con su checksum correspondiente de `nodejs.org/dist/vX/SHASUMS256.txt`).

## Cada nueva versión

Con `UpdateCheckMode: Tags` + `AutoUpdateMode: Version v%v`, basta con **subir un tag `vX.Y.Z`** nuevo (con `versionName`/`versionCode` ya bumpeados). F-Droid detecta el tag y genera el build automáticamente; no hay que tocar el `.yml` salvo que cambie la receta de compilación.

## Referencias

- Guía RN de F-Droid: <https://f-droid.org/en/docs/Building_a_ReactNative_app/>
- Ejemplo real (Mattermost): <https://gitlab.com/fdroid/fdroiddata/-/blob/master/metadata/com.mattermost.rnbeta.yml>
- Build Metadata Reference: <https://f-droid.org/en/docs/Build_Metadata_Reference/>
- Inclusion Policy: <https://f-droid.org/docs/Inclusion_Policy/>
