/**
 * @format
 * Smoke tests for @spider/privacy-js buildPrivacyBundle: each toggle must add
 * or remove exactly its fragment from the assembled injected-JS string.
 */
import {describe, it, expect} from '@jest/globals';
import {
  buildPrivacyBundle,
  canvasHardening,
  webglHardening,
  navigatorHardening,
  fontHardening,
  timezoneHardening,
  toStringCloak,
  autoconsentScript,
  PrivacyConfig,
} from '@spider/privacy-js';

const ALL_OFF: PrivacyConfig = {
  canvasNoise: false,
  webglSpoof: false,
  navigatorHarden: false,
  fontBlock: false,
  timezoneUTC: false,
  autoconsent: false,
};

const only = (over: Partial<PrivacyConfig>): PrivacyConfig => ({...ALL_OFF, ...over});

describe('buildPrivacyBundle', () => {
  it('with everything off contains no hardening fragments', () => {
    const bundle = buildPrivacyBundle(ALL_OFF);
    expect(bundle).not.toContain(canvasHardening);
    expect(bundle).not.toContain(webglHardening);
    expect(bundle).not.toContain(navigatorHardening);
    expect(bundle).not.toContain(fontHardening);
    expect(bundle).not.toContain(timezoneHardening);
    expect(bundle).not.toContain(autoconsentScript);
    // Still a valid self-contained IIFE.
    expect(bundle.startsWith('(function() {')).toBe(true);
    expect(bundle.trimEnd().endsWith('})();')).toBe(true);
  });

  it('canvasNoise adds the canvas fragment (and the toString cloak)', () => {
    const bundle = buildPrivacyBundle(only({canvasNoise: true}));
    expect(bundle).toContain(canvasHardening);
    expect(bundle).toContain(toStringCloak);
    expect(bundle).not.toContain(navigatorHardening);
  });

  it('webglSpoof adds the webgl fragment (and the toString cloak)', () => {
    const bundle = buildPrivacyBundle(only({webglSpoof: true}));
    expect(bundle).toContain(webglHardening);
    expect(bundle).toContain(toStringCloak);
  });

  it('navigatorHarden adds only the navigator fragment', () => {
    const bundle = buildPrivacyBundle(only({navigatorHarden: true}));
    expect(bundle).toContain(navigatorHardening);
    expect(bundle).not.toContain(canvasHardening);
    expect(bundle).not.toContain(toStringCloak);
  });

  it('fontBlock adds only the font fragment', () => {
    const bundle = buildPrivacyBundle(only({fontBlock: true}));
    expect(bundle).toContain(fontHardening);
    expect(bundle).not.toContain(toStringCloak);
  });

  it('timezoneUTC adds only the timezone fragment', () => {
    const bundle = buildPrivacyBundle(only({timezoneUTC: true}));
    expect(bundle).toContain(timezoneHardening);
  });

  it('autoconsent adds only the autoconsent fragment', () => {
    const bundle = buildPrivacyBundle(only({autoconsent: true}));
    expect(bundle).toContain(autoconsentScript);
    expect(bundle).not.toContain(toStringCloak);
  });

  it('everything on includes every fragment', () => {
    const bundle = buildPrivacyBundle({
      canvasNoise: true,
      webglSpoof: true,
      navigatorHarden: true,
      fontBlock: true,
      timezoneUTC: true,
      autoconsent: true,
    });
    for (const frag of [
      canvasHardening,
      webglHardening,
      navigatorHardening,
      fontHardening,
      timezoneHardening,
      toStringCloak,
      autoconsentScript,
    ]) {
      expect(bundle).toContain(frag);
    }
  });
});
