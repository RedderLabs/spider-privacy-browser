import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NetworkModeId } from '@spider/network';
import type { Language } from '../i18n/translations';
import { DEFAULT_DOH_PROVIDER_ID } from '../config/env';

// Only the boolean privacy switches are toggleable via `toggle()`.
type BooleanKeys =
  | 'hardeningEnabled'
  | 'canvasNoise'
  | 'webglSpoof'
  | 'fontBlock'
  | 'navigatorHarden'
  | 'timezoneUTC'
  | 'autoconsent'
  | 'clearOnClose'
  | 'blockCookies'
  | 'noHistory';

// Privacy profiles. 'balanced' favours compatibility (fewer CAPTCHAs / anti-bot
// walls); 'strict' is maximum hardening (may break sites). 'custom' = the user
// hand-tuned individual toggles so it no longer matches a preset.
export type PrivacyLevel = 'balanced' | 'strict' | 'custom';

// Per-site override on top of the global profile (Task 9):
//   'off'    → relax: no hardening on this domain (for sites it breaks)
//   'strict' → reinforce: force strict hardening on this domain
// Absence of a key means "follow the global profile". A per-site mode always
// wins over the global master shield.
export type SiteExceptionMode = 'off' | 'strict';

// Appearance: follow the OS ('system'), or force one. Persisted alongside the
// language — the two user preferences that survive an app close (see partialize).
export type ThemeMode = 'system' | 'light' | 'dark';

type Toggles = Pick<SettingsState, BooleanKeys>;

// Normalize a URL or bare hostname to a registrable-ish host key (lowercased,
// leading "www." stripped) used to look up per-site exceptions.
export function normalizeDomain(input: string): string {
  let host = input;
  try {
    host = new URL(input.includes('://') ? input : `https://${input}`).hostname;
  } catch {
    host = input;
  }
  return host.replace(/^www\./, '').toLowerCase();
}

// Presets applied by setPrivacyLevel(). Balanced keeps the low-breakage, low
// anti-bot defences on and drops the ones that most often trip walls (font
// enumeration block, timezone→UTC). Strict turns everything on.
const PRESETS: Record<'balanced' | 'strict', Toggles> = {
  balanced: {
    hardeningEnabled: true,
    canvasNoise: true,
    webglSpoof: true,
    navigatorHarden: true,
    fontBlock: false,
    timezoneUTC: false,
    autoconsent: true,
    clearOnClose: true,
    blockCookies: true,
    noHistory: true,
  },
  strict: {
    hardeningEnabled: true,
    canvasNoise: true,
    webglSpoof: true,
    navigatorHarden: true,
    fontBlock: true,
    timezoneUTC: true,
    autoconsent: true,
    clearOnClose: true,
    blockCookies: true,
    noHistory: true,
  },
};

interface SettingsState {
  hardeningEnabled: boolean;
  canvasNoise: boolean;
  webglSpoof: boolean;
  fontBlock: boolean;
  navigatorHarden: boolean;
  timezoneUTC: boolean;
  autoconsent: boolean;
  dohProvider: string;
  // Private-network transport: 'none' | 'orbot' (Tor) | 'mullvad' (WireGuard).
  // Replaces the old boolean `vpnEnabled` toggle with a unified selector.
  networkMode: NetworkModeId;
  clearOnClose: boolean;
  blockCookies: boolean;
  noHistory: boolean;
  language: Language;
  themeMode: ThemeMode;
  privacyLevel: PrivacyLevel;
  // Per-domain hardening overrides (Task 9). Keyed by normalizeDomain().
  siteExceptions: Record<string, SiteExceptionMode>;
  toggle: (key: BooleanKeys) => void;
  setDohProvider: (id: string) => void;
  setNetworkMode: (mode: NetworkModeId) => void;
  setLanguage: (lang: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setPrivacyLevel: (level: 'balanced' | 'strict') => void;
  // Set (or, with null, clear) the override for a domain.
  setSiteException: (domain: string, mode: SiteExceptionMode | null) => void;
}

// Effective hardening for a given domain: a per-site exception overrides the
// global master + toggles. Pure (no store subscription) so both the injected
// bundle and the WebView's request-blocking gate can share one resolution.
export interface EffectiveHardening {
  enabled: boolean;
  strict: boolean;
  toggles: Toggles;
}

const EMPTY_TOGGLES: Toggles = {
  hardeningEnabled: false,
  canvasNoise: false,
  webglSpoof: false,
  navigatorHarden: false,
  fontBlock: false,
  timezoneUTC: false,
  autoconsent: false,
  clearOnClose: false,
  blockCookies: false,
  noHistory: false,
};

export function resolveHardening(s: SettingsState, domain?: string): EffectiveHardening {
  const mode = domain ? s.siteExceptions[normalizeDomain(domain)] : undefined;
  if (mode === 'off') {
    return {enabled: false, strict: false, toggles: EMPTY_TOGGLES};
  }
  if (mode === 'strict') {
    return {enabled: true, strict: true, toggles: {...PRESETS.strict}};
  }
  return {
    enabled: s.hardeningEnabled,
    strict: s.privacyLevel === 'strict',
    toggles: {
      hardeningEnabled: s.hardeningEnabled,
      canvasNoise: s.canvasNoise,
      webglSpoof: s.webglSpoof,
      navigatorHarden: s.navigatorHarden,
      fontBlock: s.fontBlock,
      timezoneUTC: s.timezoneUTC,
      autoconsent: s.autoconsent,
      clearOnClose: s.clearOnClose,
      blockCookies: s.blockCookies,
      noHistory: s.noHistory,
    },
  };
}

// Incognito-pure persistence: only the language survives an app close/kill
// (see `partialize` below). Every privacy toggle, the profile, the DoH provider,
// per-site exceptions and networkMode reset to defaults on each launch — no
// browsing state or tunnel is silently assumed from a previous session.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Seeded from the build-time DEFAULT_DOH_PROVIDER (.env); user-overridable.
      dohProvider: DEFAULT_DOH_PROVIDER_ID,
      networkMode: 'none',
      language: 'es',
      themeMode: 'system' as ThemeMode,
      // Default to the balanced profile: fewer broken sites out of the box.
      ...PRESETS.balanced,
      privacyLevel: 'balanced' as PrivacyLevel,
      siteExceptions: {},
      // Manually flipping a switch means the config no longer matches a preset.
      toggle: (key) => set((s) => ({ [key]: !s[key], privacyLevel: 'custom' } as Toggles & { privacyLevel: PrivacyLevel })),
      setDohProvider: (id) => set({ dohProvider: id }),
      setNetworkMode: (mode) => set({ networkMode: mode }),
      setLanguage: (lang) => set({ language: lang }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setPrivacyLevel: (level) => set({ ...PRESETS[level], privacyLevel: level }),
      setSiteException: (domain, mode) => set((s) => {
        const key = normalizeDomain(domain);
        const next = { ...s.siteExceptions };
        if (mode === null) {
          delete next[key];
        } else {
          next[key] = mode;
        }
        return { siteExceptions: next };
      }),
    }),
    {
      name: 'spider-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Incognito-pure model: the only things that survive an app close/kill are
      // the two non-sensitive UI preferences — language and theme. Everything
      // else — privacy toggles, profile, DoH provider, per-site exceptions,
      // tabs — resets to defaults on each launch, so no browsing state lingers.
      // (networkMode was never persisted either.)
      partialize: (s) => ({
        language: s.language,
        themeMode: s.themeMode,
      }),
    },
  ),
);
