// Obsidian Stealth — the single source of truth for the app's visual language.
//
// These tokens are lifted from `DESIGN.md` / the Stitch "Arcane Privacy Browser"
// design system (see `stitch-designs/`). Historically every screen hardcoded its
// own copies of these colours; new/edited code should read them from here instead
// so the palette stays coherent. (Migrating the older StyleSheets is incremental.)
//
// Brand roles:
//   primary  (Electric Violet) — actions, active navigation, brand accents
//   secondary(Cyan)            — security indicators (HTTPS, VPN, encryption)
//   tertiary (Emerald)         — "clean" states (trackers blocked, site safe)

/** Compose an 8-bit-ish rgba string from a #rrggbb hex + 0..1 alpha. */
export const alpha = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// --- Dark palette (Obsidian Stealth, the original/default) -------------------
export const darkColors = {
  // Surfaces (tonal layering / elevation)
  bg: '#0D0D0F', // Level 0 — the infinite canvas (app background)
  surface: '#131316',
  surfaceCard: '#1A1A1F', // Level 1 — cards, inputs, the WebView frame
  surfaceContainer: '#1F1F22',
  surfaceHigh: '#2A2A2D', // Level 2 — floating modals

  // Text / foreground
  onSurface: '#E4E1E6',
  onSurfaceVariant: '#C9C4D8',
  muted: '#938EA1', // secondary text, inactive icons (== outline)
  faint: '#6F6A7D',

  // Primary — Electric Violet
  primary: '#CABEFF', // tinted text/icon accent on dark
  primarySolid: '#7C5CFC', // solid fills, active nav pill
  primaryBright: '#8B6DFF',

  // Secondary — Cyan (security)
  secondary: '#00D2FD',
  secondaryText: '#A2E7FF',

  // Tertiary — Emerald (clean/success)
  tertiary: '#00E478',

  // Status
  warning: '#FFD479',
  error: '#FF8A80',

  // Lines / outlines
  outline: '#484555',
  white: '#FFFFFF',
} as const;

// --- Light palette -----------------------------------------------------------
// Same token shape as dark. Surface/text tokens invert to a soft off-white
// scheme; the brand accents (violet/cyan/emerald) are *darkened* where they'd
// otherwise fail contrast on white. `white` stays white (it's the label colour
// on the violet fills, which are the same in both themes).
export const lightColors: Palette = {
  bg: '#F4F3F8', // soft off-white with a faint violet tint
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceContainer: '#ECEAF2',
  surfaceHigh: '#FFFFFF', // modals are white, elevated via shadow

  onSurface: '#1A1820', // near-black primary text
  onSurfaceVariant: '#3B3746',
  muted: '#6B6676', // secondary text, inactive icons
  faint: '#9A94A6',

  primary: '#6A4CE0', // darker violet so tinted text/icons read on white
  primarySolid: '#7C5CFC', // fills keep the brand violet (white label on top)
  primaryBright: '#6A4CE0',

  secondary: '#0090C4', // darkened cyan for contrast on light
  secondaryText: '#0A7096',

  tertiary: '#00A65A', // darkened emerald for contrast on light

  warning: '#9A6B00',
  error: '#C43A2C',

  outline: '#D6D3E0',
  white: '#FFFFFF',
} as const;

// Back-compat alias: unmigrated modules still `import { colors }` and get dark.
// New/edited code should read the active palette from `useTheme()`.
export const colors = darkColors;

/** Common translucent fills, derived so callers don't re-type rgba() by hand. */
export const darkSurfaces = {
  card: alpha('#1F1F22', 0.6), // standard card background over bg
  hairline: alpha('#FFFFFF', 0.08), // 1px card borders
  divider: alpha('#FFFFFF', 0.05),
  primaryTint: alpha('#7C5CFC', 0.12), // active/selected wash
  primaryBorder: alpha('#7C5CFC', 0.4),
  cyanTint: alpha('#00D2FD', 0.1),
  emeraldTint: alpha('#00E478', 0.1),
  glass: alpha('#0D0D0F', 0.4), // top-bar / chrome overlay
} as const;

export const lightSurfaces: Surfaces = {
  card: alpha('#FFFFFF', 0.9), // near-solid white card over the off-white bg
  hairline: alpha('#000000', 0.08), // dark hairline on light
  divider: alpha('#000000', 0.06),
  primaryTint: alpha('#7C5CFC', 0.12), // same subtle violet wash reads on light
  primaryBorder: alpha('#7C5CFC', 0.4),
  cyanTint: alpha('#0090C4', 0.12),
  emeraldTint: alpha('#00A65A', 0.12),
  glass: alpha('#F4F3F8', 0.7), // light chrome overlay
} as const;

export const surfaces = darkSurfaces;

/** A resolved palette + its translucent fills, as handed out by `useTheme()`.
 *  Values are widened to `string` so the light palette (different hex literals)
 *  satisfies the same type as the dark one. */
export type Palette = { readonly [K in keyof typeof darkColors]: string };
export type Surfaces = { readonly [K in keyof typeof darkSurfaces]: string };

/** Corner radii. Inputs 12 · cards 16 · nav & sheets 24 · buttons pill. */
export const radius = {
  sm: 8,
  input: 12,
  card: 16,
  lg: 24,
  pill: 999,
} as const;

/** Spacing scale — 8px base grid, 20px container margin. */
export const spacing = {
  margin: 20,
  gutter: 12,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  safeBottom: 34,
} as const;

/** Typography scale (Inter). fontFamily left to the platform default until the
 *  font is bundled; sizes/weights/spacing follow the Obsidian Stealth scale. */
export const type = {
  headlineLg: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.6 },
  headlineMd: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.3 },
  headlineSm: { fontSize: 20, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, fontWeight: '400' as const },
  labelLg: { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.7 },
  labelMd: { fontSize: 12, fontWeight: '500' as const },
} as const;

export const theme = { colors, surfaces, radius, spacing, type } as const;
export default theme;
