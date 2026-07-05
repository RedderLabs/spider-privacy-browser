// Build-time configuration, read from `.env` via react-native-dotenv (@env is a
// virtual module inlined by babel — see babel.config.js). This is the single
// place that touches @env so the rest of the app imports typed, coerced values.
import {
  PRIVACY_JS_ENABLED,
  CONTENT_BLOCKING_ENABLED,
  DEFAULT_DOH_PROVIDER,
} from '@env';

// Flags are opt-OUT: only an explicit "false" disables them. Missing/blank keeps
// the privacy-first default (feature on). Case/whitespace tolerant.
const flag = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw == null || raw.trim() === '') {
    return fallback;
  }
  return raw.trim().toLowerCase() !== 'false';
};

export const FEATURES = {
  // Master BUILD switch for the injected fingerprint-hardening bundle. When
  // false the bundle is never injected, regardless of the user's shield toggle.
  privacyJs: flag(PRIVACY_JS_ENABLED, true),
  // Master BUILD switch for tracker request blocking (in-page blocker + the
  // navigation blocklist in HardenedWebView).
  contentBlocking: flag(CONTENT_BLOCKING_ENABLED, true),
} as const;

// Default encrypted-DNS provider id used to seed settingsStore.dohProvider.
// Falls back to Mullvad if the key is absent.
export const DEFAULT_DOH_PROVIDER_ID: string =
  DEFAULT_DOH_PROVIDER && DEFAULT_DOH_PROVIDER.trim() !== ''
    ? DEFAULT_DOH_PROVIDER.trim()
    : 'mullvad';
