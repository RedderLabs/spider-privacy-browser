Design a mobile privacy browser app UI with the following screens:
Visual style:

Dark theme with vibrant color accents inspired by Arc Browser. Deep dark backgrounds (#0D0D0F, #111114), surfaces with subtle elevation (#1A1A1F, #222228). Primary accent: electric violet/purple (#7C5CFC). Secondary accents: cyan (#00D4FF) and emerald (#00E87A) used sparingly for status indicators. Rounded corners everywhere (16-24px radius). Smooth, premium feel. SF Pro / Inter typography. No sharp edges, no flat corporate look.
Screen 1 — Main browser / address bar:

Full screen WebView area (majority of screen)
Floating bottom bar (not fixed toolbar) with: back/forward arrows, address bar centered (pill shape, dark surface, shows current domain), privacy shield icon with accent glow when active, tabs counter button (rounded square showing number)
Address bar when focused: expands upward, shows search suggestions below, keyboard appears
Top: minimal status indicators (connection encrypted = cyan dot, tracker count blocked = small purple badge)
No clutter. Feels like the web is the focus.

Screen 2 — Tab manager:

Grid layout (2 columns) of tab cards, each showing a website thumbnail, favicon, domain name, close button (X top right of card)
Cards have dark surface with subtle border, rounded 20px
Top bar: "X tabs open" label left, "New Tab" button right (accent purple, pill shape)
Bottom: "Close all" button (destructive, muted red) centered
Empty state: centered icon + "No open tabs" message

Screen 3 — Privacy settings:

Clean list-based layout with section headers
Sections: "Fingerprint Protection" (canvas noise, WebGL spoof, font blocking — each as toggle row with subtitle), "Network" (DNS over HTTPS selector with provider options: Mullvad / AdGuard / NextDNS, VPN/Proxy toggle + config), "Session" (clear on close toggle, no history toggle, block third-party cookies toggle)
Each toggle row: icon left (accent colored), label + subtitle, iOS-style toggle right
Privacy score card at top: circular score (0-100), label "Your fingerprint resistance", accent gradient fill

General specs:

Mobile screens (390x844px, iPhone 15 proportions)
React Native compatible component structure
All interactive elements clearly visible
Dark surfaces: use layered elevation, not flat
Accent color (#7C5CFC) on active states, selected toggles, CTAs
Status bar dark content


Cópialo tal cual en Stitch. Si quieres ajustar el color de acento (por ejemplo tirarlo más hacia azul eléctrico o verde) dímelo antes de lanzarlo.