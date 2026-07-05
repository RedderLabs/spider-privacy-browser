// Smoke test: the build-time config module reads .env via react-native-dotenv
// (@env is inlined by babel) and exposes coerced, typed values.
import {describe, it, expect} from '@jest/globals';
import {FEATURES, DEFAULT_DOH_PROVIDER_ID} from '../src/config/env';

describe('build-time env config', () => {
  it('exposes boolean feature flags', () => {
    expect(typeof FEATURES.privacyJs).toBe('boolean');
    expect(typeof FEATURES.contentBlocking).toBe('boolean');
    expect(typeof FEATURES.geckoView).toBe('boolean');
  });

  it('matches the committed .env defaults', () => {
    // .env ships with both hardening flags on and Mullvad as the default DoH
    // provider; the experimental GeckoView engine is opt-in (OFF by default).
    expect(FEATURES.privacyJs).toBe(true);
    expect(FEATURES.contentBlocking).toBe(true);
    expect(FEATURES.geckoView).toBe(false);
    expect(DEFAULT_DOH_PROVIDER_ID).toBe('mullvad');
  });
});
