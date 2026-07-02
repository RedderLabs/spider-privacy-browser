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

export const colors = {
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

/** Common translucent fills, derived so callers don't re-type rgba() by hand. */
export const surfaces = {
  card: alpha('#1F1F22', 0.6), // standard card background over bg
  hairline: alpha('#FFFFFF', 0.08), // 1px card borders
  divider: alpha('#FFFFFF', 0.05),
  primaryTint: alpha('#7C5CFC', 0.12), // active/selected wash
  primaryBorder: alpha('#7C5CFC', 0.4),
  cyanTint: alpha('#00D2FD', 0.1),
  emeraldTint: alpha('#00E478', 0.1),
  glass: alpha('#0D0D0F', 0.4), // top-bar / chrome overlay
} as const;

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
