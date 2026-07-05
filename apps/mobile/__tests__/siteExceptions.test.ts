/**
 * @format
 * Task 9 — per-site hardening exceptions: normalizeDomain, setSiteException,
 * resolveHardening precedence over the global master, and the app's
 * buildPrivacyBundle adapter honouring a domain override.
 */
import {describe, it, expect, beforeEach} from '@jest/globals';
import {
  useSettingsStore,
  resolveHardening,
  normalizeDomain,
} from '../src/store/settingsStore';
import {buildPrivacyBundle} from '../src/privacy/bundle';

beforeEach(() => {
  // Start each test from a clean, known-global state: balanced profile, shield
  // on, no per-site exceptions.
  useSettingsStore.getState().setPrivacyLevel('balanced');
  useSettingsStore.setState({hardeningEnabled: true, siteExceptions: {}});
});

describe('normalizeDomain', () => {
  it('lowercases, strips www, and extracts host from a full URL', () => {
    expect(normalizeDomain('https://WWW.Example.com/path?q=1')).toBe('example.com');
    expect(normalizeDomain('www.Example.COM')).toBe('example.com');
    expect(normalizeDomain('sub.example.com')).toBe('sub.example.com');
  });
});

describe('setSiteException', () => {
  it('sets and clears an override, keyed by normalized domain', () => {
    const {setSiteException} = useSettingsStore.getState();
    setSiteException('https://WWW.Example.com/x', 'off');
    expect(useSettingsStore.getState().siteExceptions['example.com']).toBe('off');
    // Any equivalent form targets the same key.
    setSiteException('example.com', 'strict');
    expect(useSettingsStore.getState().siteExceptions['example.com']).toBe('strict');
    // null clears it.
    setSiteException('example.com', null);
    expect(useSettingsStore.getState().siteExceptions['example.com']).toBeUndefined();
  });
});

describe('resolveHardening precedence', () => {
  it('with no domain follows the global master + toggles', () => {
    const eff = resolveHardening(useSettingsStore.getState());
    expect(eff.enabled).toBe(true);
    useSettingsStore.setState({hardeningEnabled: false});
    expect(resolveHardening(useSettingsStore.getState()).enabled).toBe(false);
  });

  it("'off' disables hardening even when the global master is on", () => {
    useSettingsStore.getState().setSiteException('a.com', 'off');
    const eff = resolveHardening(useSettingsStore.getState(), 'https://a.com');
    expect(eff.enabled).toBe(false);
    expect(eff.strict).toBe(false);
  });

  it("'strict' forces strict hardening even when the global master is off", () => {
    useSettingsStore.setState({hardeningEnabled: false});
    useSettingsStore.getState().setSiteException('b.com', 'strict');
    const eff = resolveHardening(useSettingsStore.getState(), 'https://b.com/page');
    expect(eff.enabled).toBe(true);
    expect(eff.strict).toBe(true);
    // Strict preset turns on the aggressive defences.
    expect(eff.toggles.fontBlock).toBe(true);
    expect(eff.toggles.timezoneUTC).toBe(true);
  });

  it('a domain without an exception is unaffected by another domain override', () => {
    useSettingsStore.getState().setSiteException('a.com', 'off');
    expect(resolveHardening(useSettingsStore.getState(), 'https://other.com').enabled).toBe(true);
  });
});

describe('buildPrivacyBundle honours per-site exceptions', () => {
  it("injects nothing for an 'off' domain", () => {
    useSettingsStore.getState().setSiteException('off.com', 'off');
    expect(buildPrivacyBundle('https://off.com')).toBe('');
  });

  it("injects the hardening bundle for a 'strict' domain even with the master off", () => {
    useSettingsStore.setState({hardeningEnabled: false});
    useSettingsStore.getState().setSiteException('strict.com', 'strict');
    const bundle = buildPrivacyBundle('https://strict.com');
    expect(bundle.length).toBeGreaterThan(0);
    expect(bundle).toContain('(function() {');
    // Global master off → a domain with no exception injects nothing.
    expect(buildPrivacyBundle('https://plain.com')).toBe('');
  });
});
