# Stitch designs — Arcane Privacy Browser

Diseños exportados del proyecto Stitch **"Arcane Privacy Browser"**
(projectId `11311578130060060727`, design system *Obsidian Stealth*, descargados 2026-07-02).

Sirven de **referencia visual** para implementar/afinar las pantallas de la app. NO son código
de producción: son HTML + **Tailwind CDN** para preview en navegador. En React Native hay que
traducir los tokens a `StyleSheet` (o al futuro `@spider/ui` / `theme.ts`), no se usa Tailwind.

## Contenido

| Archivo HTML | Screenshot | Pantalla en la app |
|---|---|---|
| `main-screen.html` | `screenshots/main-screen.png` | Home / `HomeContent.tsx` (escudo, URL bar, chip "Conectado a Red Privada") |
| `main-browser.html` | `screenshots/main-browser.png` | `BrowserScreen.tsx` (badges ENCRYPTED / X TRACKERS BLOCKED, URL bar flotante) |
| `tabs.html` | `screenshots/tabs.png` | `TabsScreen.tsx` (grid 2×2, "+ Nueva Pestaña", "Cerrar todas") |
| `tab-manager.html` | `screenshots/tab-manager.png` | `TabsScreen.tsx` — variante EN con previews de contenido |
| `drawer.html` | `screenshots/drawer.png` | `Drawer.tsx` (perfil, SECURITY, Privacy Score) |
| `settings.html` | `screenshots/settings.png` | `SettingsScreen.tsx` (ES) — Protección de huella / Red / Sesión |
| `privacy-settings.html` | `screenshots/privacy-settings.png` | `SettingsScreen.tsx` (EN) + banner Vault Premium |
| — (solo PNG) | `screenshots/cover.png` | Portada marketing (`SpiderPrivacyBrowser.png`), no navegable |

## Stack de los mockups

- **Tailwind** vía `cdn.tailwindcss.com` (plugins forms + container-queries) — solo para el preview.
- **Fuentes:** Inter (400/500/600/700), JetBrains Mono (código/datos técnicos), Material Symbols Outlined (iconos).
- **Design system "Obsidian Stealth"** (mismos tokens que `DESIGN.md`). Colores clave:
  - `primary` Electric Violet `#cabeff` / override `#7c5cfc` — acciones, nav activa
  - `secondary` Cyan `#00d4ff` / `#a2e7ff` — indicadores de seguridad (HTTPS, VPN, cifrado)
  - `tertiary` Emerald `#00e87a` / `#00e478` — estados "limpio" (trackers bloqueados, sitio seguro)
  - `surface` base `#131316`, contenedores `#1b1b1e` / `#1f1f22` / `#2a2a2d`
  - `on-surface` `#e4e1e6`, `on-surface-variant` `#c9c4d8`, `outline` `#938ea1`
  - Radios: inputs 12px, cards 16px, nav/sheets 24px, botones pill (full)

## Cómo portar a React Native

1. Abre el `.html` en el navegador (o mira el `.png`) para ver el diseño objetivo.
2. Traduce clases Tailwind → `StyleSheet` en el componente RN correspondiente (tabla de arriba).
   Ej: `rounded-2xl` → `borderRadius: 16`, `bg-[#1f1f22]` → `backgroundColor: '#1f1f22'`.
3. Iconos Material Symbols → sustituir por los de `src/components/icons.tsx`.
4. **Efectos glassmorphism** (backdrop-blur): en RN requieren `@react-native-community/blur`
   o un color sólido aproximado; hoy la app usa colores sólidos.

## ⚠️ Elementos aspiracionales (NO implementar tal cual)

El mockup enseña features que chocan con el modelo del proyecto (sin cuenta, sin persistencia de sesión):

- **Privacy Score 98** y "3,421 trackers blocked this week" → la app NO guarda historial (requisito de
  privacidad). Serían cosméticos, como el `trackersBlocked` semilla.
- Perfil de usuario "Alex Rivera · Sync Active", **Vault Sync**, **Bookmarks**, **Passkeys**,
  **Vault Premium** → no existen y contradicen "incognito por defecto, sin cuenta".
- **Vault VPN "LIVE"** → en el código la Red Privada es el selector `Directa / Orbot / Mullvad`
  (Mullvad = "próximamente").
- Thumbnails reales de tabs → hoy son iconos (deuda técnica en `ROADMAP.md`).
