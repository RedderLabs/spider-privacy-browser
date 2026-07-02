# Privacy Browser Mobile — Documento de Arranque

> Browser móvil cross-platform (Android + iOS) con fingerprint resistance, content blocking, y red privada. Inspirado en Mullvad Browser.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Shell UI | React Native (bare workflow) + TypeScript |
| Monorepo | Turborepo + pnpm |
| Motor Android | GeckoView (Fase 2) / WebView hardened (Fase 1) |
| Motor iOS | WKWebView hardened |
| Privacy JS | Bundle inyectado en cada página |
| Content Blocking | WKContentRuleList (iOS) + AdGuard DNS |
| Red | DoH forzado → Tor vía Orbot → WireGuard (Fase 3/5) |
| Crypto | react-native-libsodium |

---

## Estructura del proyecto

> **Fase 1 — estructura actual** (RN 0.76 flat, sin monorepo). La estructura de monorepo con `apps/` y `packages/` se introduce en Fase 2.

```
SpiderPrivacyBrowser/               # raíz del proyecto (F:\proyecto-spider-browser)
├── android/                        # proyecto Android nativo (generado por RN)
│   └── app/src/main/
│       ├── java/com/spiderprivacybrowser/
│       │   ├── GeckoViewModule.kt       # Módulo nativo GeckoView (Fase 2)
│       │   └── VpnServiceModule.kt      # Android VpnService (Fase 3)
│       └── res/
├── ios/                            # proyecto iOS nativo (generado por RN)
│   ├── SpiderPrivacyBrowser/
│   │   ├── ContentRules.swift          # WKContentRuleList loader (Fase 2)
│   │   └── HardenedWebView.swift       # WKWebView configurado (Fase 2)
│   └── SpiderPrivacyBrowser.xcworkspace
├── src/                            # código fuente JS/TS
│   ├── components/
│   │   └── HardenedWebView.tsx         # WebView hardened ✅
│   ├── privacy/
│   │   └── bundle.ts                   # Privacy JS bundle (import local) ✅
│   ├── store/
│   │   └── tabStore.ts                 # Gestión de tabs en memoria
│   └── screens/
│       ├── BrowserScreen.tsx           # Pantalla principal
│       ├── TabsScreen.tsx              # Gestor de pestañas
│       └── SettingsScreen.tsx          # Settings de privacidad
├── App.tsx                         # Entry point
├── package.json
├── tsconfig.json                   # Extiende @react-native/typescript-config ✅
└── pnpm-lock.yaml                  # Lockfile pnpm ✅

# Dependencias instaladas
# ✅ react-native-webview
# ✅ @react-native-async-storage/async-storage
# ✅ react-native-safe-area-context
# ✅ react-native-screens
# ✅ zustand
```

> **Fase 2 — migración a monorepo** (cuando se integre GeckoView):
> ```
> proyecto-spider-browser/
> ├── apps/mobile/        ← mover SpiderPrivacyBrowser aquí
> ├── packages/
> │   ├── privacy-js/     ← extraer src/privacy/ aquí
> │   ├── content-blocking/
> │   └── ui/
> ├── turbo.json
> └── pnpm-workspace.yaml
> ```

---

## Fase 1 — MVP (semanas 1-4)

### Objetivos
- [x] Proyecto RN 0.76.9 inicializado con TypeScript
- [x] Dependencias base instaladas (pnpm)
- [x] WebView hardened — componente base
- [x] Privacy JS bundle inyectado (import local `src/privacy/bundle.ts`)
- [ ] Shell con tabs en memoria (tabStore)
- [ ] Sin cookies/historial persistente (incognito mode activo)
- [ ] DoH forzado

### Setup inicial

```bash
# ✅ COMPLETADO — RN 0.76.9 con TypeScript
npx @react-native-community/cli@latest init SpiderPrivacyBrowser

# ✅ COMPLETADO — Dependencias instaladas con pnpm
pnpm add react-native-webview
pnpm add @react-native-async-storage/async-storage
pnpm add react-native-safe-area-context
pnpm add react-native-screens
pnpm add zustand
```

> ⚠️ **Notas de instalación:**
> - El proyecto debe estar en una ruta **sin caracteres especiales** (`F:\proyecto-spider-browser`) — Gradle falla con non-ASCII (la `ñ` en `tela_araña` lo rompió).
> - Migrado de `npm` a `pnpm`: requirió borrar `node_modules` y `package-lock.json` antes de `pnpm install`.
> - Los warnings de `eslint@8.57.1` deprecated son normales con RN 0.76, no bloquean el build.
> - El flag `--template react-native-template-typescript` está deprecated desde RN 0.71 — TypeScript viene incluido por defecto.

### WebView hardened — configuración base

```tsx
// src/components/HardenedWebView.tsx
import React from 'react';
import { WebView, WebViewProps } from 'react-native-webview';
import { privacyBundle } from '../privacy/bundle'; // import local Fase 1
// Fase 2 monorepo: import { privacyBundle } from '@privacy-browser/privacy-js';

const isBlocked = (url: string): boolean => {
  const blocklist = [
    'doubleclick.net',
    'google-analytics.com',
    'facebook.net',
    'googlesyndication.com',
    'googletagmanager.com',
  ];
  return blocklist.some(domain => url.includes(domain));
};

interface HardenedWebViewProps extends WebViewProps {
  url: string;
}

export const HardenedWebView: React.FC<HardenedWebViewProps> = ({ url, ...props }) => {
  return (
    <WebView
      source={{ uri: url }}
      incognito={true}
      injectedJavaScriptBeforeContentLoaded={privacyBundle}
      mixedContentMode="never"
      cacheEnabled={false}
      cacheMode="LOAD_NO_CACHE"
      onShouldStartLoadWithRequest={(request) => {
        return !isBlocked(request.url);
      }}
      {...props}
    />
  );
};
```

### Privacy JS bundle

> En Fase 1 el bundle vive en `src/privacy/bundle.ts` como import local. En Fase 2 se extrae a `packages/privacy-js/` dentro del monorepo.

```typescript
// src/privacy/bundle.ts  ← archivo real en Fase 1
export const canvasHardening = `
(function() {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  HTMLCanvasElement.prototype.toDataURL = function(type) {
    const ctx = this.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i]   += Math.floor(Math.random() * 3) - 1;
        imageData.data[i+1] += Math.floor(Math.random() * 3) - 1;
        imageData.data[i+2] += Math.floor(Math.random() * 3) - 1;
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, arguments);
  };
})();
`;

// packages/privacy-js/src/webgl.ts
export const webglHardening = `
(function() {
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return 'Intel Inc.';
    if (param === 37446) return 'Intel Iris OpenGL Engine';
    return getParameter.call(this, param);
  };
  const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
  WebGL2RenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return 'Intel Inc.';
    if (param === 37446) return 'Intel Iris OpenGL Engine';
    return getParameter2.call(this, param);
  };
})();
`;

// packages/privacy-js/src/navigator.ts
export const navigatorHardening = `
(function() {
  Object.defineProperties(navigator, {
    hardwareConcurrency: { get: () => 2 },
    deviceMemory:        { get: () => 8 },
    languages:           { get: () => ['en-US', 'en'] },
    platform:            { get: () => 'Win32' },
    vendor:              { get: () => 'Google Inc.' },
    maxTouchPoints:      { get: () => 0 },
  });
})();
`;

// packages/privacy-js/src/timezone.ts
export const timezoneHardening = `
(function() {
  Date.prototype.getTimezoneOffset = () => 0;
  Intl.DateTimeFormat = new Proxy(Intl.DateTimeFormat, {
    construct(target, args) {
      if (args[1]) args[1].timeZone = 'UTC';
      return new target(...args);
    }
  });
})();
`;

// packages/privacy-js/src/fonts.ts
export const fontHardening = `
(function() {
  if (document.fonts) {
    Object.defineProperty(document, 'fonts', {
      get: () => ({
        check: () => false,
        load: () => Promise.resolve([]),
        ready: Promise.resolve(),
        status: 'loaded',
        size: 0,
        [Symbol.iterator]: function* () {},
      })
    });
  }
})();
`;

// packages/privacy-js/src/index.ts
import { canvasHardening } from './canvas';
import { webglHardening } from './webgl';
import { navigatorHardening } from './navigator';
import { timezoneHardening } from './timezone';
import { fontHardening } from './fonts';

export const privacyBundle = [
  canvasHardening,
  webglHardening,
  navigatorHardening,
  timezoneHardening,
  fontHardening,
].join('\n');
```

### Gestión de tabs (en memoria, sin persistencia)

```typescript
// apps/mobile/src/store/tabStore.ts
import { create } from 'zustand';

interface Tab {
  id: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (url?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  clearAll: () => void; // limpia todo al salir
}

export const useTabStore = create<TabStore>((set) => ({
  tabs: [],
  activeTabId: null,
  addTab: (url = 'about:blank') => {
    const id = crypto.randomUUID();
    set((s) => ({
      tabs: [...s.tabs, { id, url, title: 'Nueva pestaña', canGoBack: false, canGoForward: false }],
      activeTabId: id,
    }));
  },
  closeTab: (id) => set((s) => {
    const remaining = s.tabs.filter((t) => t.id !== id);
    return {
      tabs: remaining,
      activeTabId: remaining.length > 0 ? remaining[remaining.length - 1].id : null,
    };
  }),
  setActiveTab: (id) => set({ activeTabId: id }),
  updateTab: (id, updates) => set((s) => ({
    tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  clearAll: () => set({ tabs: [], activeTabId: null }),
}));
```

---

## Fase 2 — GeckoView Android (semanas 5-8)

### Dependencias nativas

```kotlin
// android/app/build.gradle
dependencies {
    implementation "org.mozilla.geckoview:geckoview-default:128.0"
}
```

### Módulo nativo React Native

```kotlin
// GeckoViewModule.kt
class GeckoViewModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var runtime: GeckoRuntime? = null

    override fun getName() = "GeckoViewModule"

    @ReactMethod
    fun initialize() {
        val settings = GeckoRuntimeSettings.Builder()
            .trackingProtectionCategories(
                ContentBlocking.AntiTracking.DEFAULT or
                ContentBlocking.AntiTracking.FINGERPRINTING or
                ContentBlocking.AntiTracking.CRYPTOMINING
            )
            .enhancedTrackingProtectionLevel(ContentBlocking.EtpLevel.STRICT)
            .build()

        runtime = GeckoRuntime.create(reactApplicationContext, settings)
    }
}
```

---

## Fase 3 — Red privada (semanas 9-12)

### DoH forzado (disponible desde Fase 1)

```typescript
// packages/network/src/doh.ts
export const DOH_PROVIDERS = {
  mullvad:  'https://dns.mullvad.net/dns-query',
  adguard:  'https://dns.adguard-dns.com/dns-query',
  nextdns:  'https://dns.nextdns.io/YOUR_ID',
  cloudflare: 'https://cloudflare-dns.com/dns-query',
} as const;

// Configurar en Android via Network Security Config
// Configurar en iOS via NEDNSSettingsManager
```

### Tor vía Orbot (Android) — camino pragmático

En lugar de construir un `VpnService` propio desde el principio, se integra **Orbot** (Guardian Project), que ya expone Tor como VPN del sistema. La app solo lo detecta, lo lanza por intent y refleja el estado; cuando la VPN de Orbot está activa, **todo** el tráfico (incluido el del WebView) va por Tor a nivel de sistema operativo.

```kotlin
// OrbotModule.kt — bridge RN → app Orbot (org.torproject.android)
// isInstalled(): comprueba el paquete de Orbot
// start():       envía la acción START y trae Orbot a primer plano (consent VPN)
// openInstall(): abre la ficha de la store si Orbot no está instalado
val intent = Intent("org.torproject.android.intent.action.START")
    .setPackage("org.torproject.android")
context.sendBroadcast(intent)
```

```typescript
// @spider/network — selector unificado de red privada
export type NetworkModeId = 'none' | 'orbot' | 'mullvad';
// NETWORK_MODE_LIST: Directa / Orbot (Tor) / Mullvad WireGuard (próximamente)
// ORBOT: { packageId, actionStart, socks:9050, http:8118, installUrl }
```

> ⚠️ Android 11+ exige declarar `<queries><package android:name="org.torproject.android"/></queries>` en el manifest para poder detectar/lanzar Orbot. iOS no tiene handoff app-a-app equivalente (Tor queda como solo-Android por ahora).

### Android VpnService (WireGuard) — Fase 5b

```kotlin
// VpnServiceModule.kt — estructura base
class PrivacyVpnService : VpnService() {
    // Usar wireguard-android library
    // https://git.zx2c4.com/wireguard-android
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val builder = Builder()
            .addAddress("10.64.0.1", 32)
            .addDnsServer("194.242.2.2") // Mullvad DNS
            .addRoute("0.0.0.0", 0)      // Full tunnel
            .setMtu(1420)
        // establecer túnel WireGuard...
        return START_STICKY
    }
}
```

---

## Content Blocking — formato WKContentRuleList

```json
// packages/content-blocking/lists/base-rules.json
[
  {
    "trigger": {
      "url-filter": ".*\\.doubleclick\\.net.*",
      "resource-type": ["image", "script", "xmlhttprequest"]
    },
    "action": { "type": "block" }
  },
  {
    "trigger": {
      "url-filter": ".*google-analytics\\.com.*"
    },
    "action": { "type": "block" }
  },
  {
    "trigger": {
      "url-filter": ".*facebook\\.net/en_US/fbevents\\.js"
    },
    "action": { "type": "block" }
  }
]
```

```swift
// iOS: compilar y aplicar reglas
// ContentRules.swift
func loadContentRules(webView: WKWebView) {
    guard let rulesPath = Bundle.main.path(forResource: "base-rules", ofType: "json"),
          let rulesJSON = try? String(contentsOfFile: rulesPath) else { return }

    WKContentRuleListStore.default().compileContentRuleList(
        forIdentifier: "privacy-browser-rules",
        encodedContentRuleList: rulesJSON
    ) { ruleList, error in
        guard let ruleList = ruleList else { return }
        webView.configuration.userContentController.add(ruleList)
    }
}
```

---

## Variables de entorno

```env
# .env.development
DOH_PROVIDER=https://dns.mullvad.net/dns-query
CONTENT_BLOCKING_ENABLED=true
PRIVACY_JS_ENABLED=true
GECKO_VERSION=128.0
```

---

## Comandos de desarrollo

```bash
# Arrancar Metro bundler
pnpm dev

# iOS
pnpm ios

# Android
pnpm android

# Build privacy JS bundle
pnpm --filter @privacy-browser/privacy-js build

# Tests
pnpm test
```

---

## Referencias

- [GeckoView Android Docs](https://mozilla.github.io/geckoview/)
- [WKWebView Privacy — Apple Docs](https://developer.apple.com/documentation/webkit/wkwebview)
- [WKContentRuleList — Safari Content Blocking](https://developer.apple.com/documentation/safariservices/creating_a_content_blocker)
- [WireGuard Android Library](https://git.zx2c4.com/wireguard-android)
- [Mullvad Browser source (Firefox fork)](https://github.com/mullvad/mullvad-browser)
- [Firefox Focus — referencia de implementación móvil](https://github.com/mozilla-mobile/firefox-ios)