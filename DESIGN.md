---
name: Obsidian Stealth
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1e'
  surface-container: '#1f1f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e4e1e6'
  on-surface-variant: '#c9c4d8'
  inverse-surface: '#e4e1e6'
  inverse-on-surface: '#303033'
  outline: '#938ea1'
  outline-variant: '#484555'
  surface-tint: '#cabeff'
  primary: '#cabeff'
  on-primary: '#32009a'
  primary-container: '#947dff'
  on-primary-container: '#2b0088'
  inverse-primary: '#613de0'
  secondary: '#a2e7ff'
  on-secondary: '#003642'
  secondary-container: '#00d2fd'
  on-secondary-container: '#005669'
  tertiary: '#00e478'
  on-tertiary: '#003919'
  tertiary-container: '#00a756'
  on-tertiary-container: '#003115'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4918c8'
  secondary-fixed: '#b4ebff'
  secondary-fixed-dim: '#3cd7ff'
  on-secondary-fixed: '#001f27'
  on-secondary-fixed-variant: '#004e5f'
  tertiary-fixed: '#61ff98'
  tertiary-fixed-dim: '#00e478'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005227'
  background: '#131316'
  on-background: '#e4e1e6'
  surface-variant: '#353438'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 20px
  gutter: 12px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  safe-area-bottom: 34px
---

## Brand & Style
The brand personality is centered on "Invisible Power"—a sophisticated, high-performance privacy tool that feels like a premium digital vault. The target audience includes privacy-conscious professionals and tech enthusiasts who value both security and aesthetic refinement. 

The design style is a hybrid of **Minimalism** and **Glassmorphism**. It utilizes deep, ink-like backgrounds to minimize eye strain and emphasize focus, while using translucent, blurred surfaces to create a sense of physical depth. Active privacy features are highlighted with vibrant, neon-like "glows" to provide immediate visual feedback that the user is protected. Every interaction should feel fluid, silent, and secure.

## Colors
The palette is rooted in a "Deep Dark" spectrum to ensure maximum contrast for functional accents.
- **Primary (Electric Violet):** Used for the main action buttons (New Tab, Shield Toggle) and active navigation states.
- **Secondary (Cyan):** Dedicated exclusively to security indicators, such as HTTPS locks, VPN status, and encryption confirmation.
- **Tertiary (Emerald):** Used for "Clean" states—tracker blocks successful, site safe, or downloads complete.
- **Neutral/Background:** The base is a near-black charcoal to ensure the screen disappears into the hardware bezel, with elevated grays used for functional containers.

## Typography
This design system utilizes **Inter** for its neutral, systematic clarity, ensuring that technical information remains highly legible. 
- **Headlines:** Use tighter letter spacing and heavier weights to create a sense of authority.
- **Body Text:** Standard weight for readability against dark backgrounds. Use a slightly dimmed white (e.g., 90% opacity) to reduce "haloing" effects on OLED screens.
- **Mono:** A secondary monospaced font is used sparingly for technical data, such as IP addresses or encryption keys, to reinforce the "security" aesthetic.

## Layout & Spacing
The layout follows a **Fluid Grid** model optimized for the 390x844px mobile viewport.
- **Margins:** A consistent 20px horizontal margin ensures content is comfortably inset from the screen edges.
- **Stacking:** Vertical spacing follows an 8px base grid (8, 16, 24, 32).
- **Safe Areas:** Navigation elements must respect the bottom home indicator, typically requiring a 34px buffer.
- **Touch Targets:** All interactive elements maintain a minimum hit area of 44x44px, even if the visual asset is smaller.

## Elevation & Depth
Depth is expressed through **Glassmorphism** and **Tonal Layering**.
- **Level 0 (Base):** #0D0D0F. The infinite canvas.
- **Level 1 (Cards/Inputs):** #1A1A1F. Used for grouped content.
- **Level 2 (Floating Modals):** #222228 with a 20px Backdrop Blur and 40% opacity. This creates a "frosted" look where the background content is visible but obscured.
- **Shadows:** Avoid heavy black shadows. Instead, use a subtle 1px inner border (10% white) to define edges and a vibrant 15px outer glow (#7C5CFC at 15% opacity) for high-priority active elements like a "Shield Active" button.

## Shapes
The shape language is ultra-smooth, avoiding all sharp corners to create a friendly yet modern feel.
- **Standard Radius:** 16px for cards and containers.
- **Large Radius:** 24px for main navigation bars and full-screen sheets.
- **Buttons:** Fully pill-shaped (rounded-full) to provide a distinct contrast against rectangular content cards.
- **Inputs:** 12px radius to maintain a compact but soft appearance.

## Components
- **Buttons:** Primary buttons use a solid Electric Violet fill with white text. Secondary buttons use a glass-effect background (white at 10% opacity) with a thin 1px border.
- **URL Bar:** Floating at the bottom for ergonomics. Uses a high-blur glassmorphic container (24px radius) with an "Inner Glow" when the user is in Private Mode.
- **Privacy Shield:** A custom toggle component. When active, it pulses with a Cyan/Violet gradient glow.
- **Tabs:** Displayed as a vertical stack of "cards" with 16px rounding, utilizing a subtle scale-down animation when entering the tab switcher.
- **Status Chips:** Small, pill-shaped indicators (e.g., "Encrypted", "Trackers Blocked"). Emerald text on a 10% Emerald background tint.
- **Input Fields:** Dark gray backgrounds (#1A1A1F) with no border unless focused. Upon focus, the border transitions to a 1.5px Cyan stroke.