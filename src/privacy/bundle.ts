// Thin adapter: reads the app's privacy toggles and delegates the actual bundle
// assembly to the @spider/privacy-js package (the single source of truth).
// This is a plain function (not a hook): it reads the store at call time.
import {buildPrivacyBundle as build, buildRequestBlocker} from '@spider/privacy-js';
import {TRACKER_DOMAINS} from '@spider/network';
import {useSettingsStore, resolveHardening} from '../store/settingsStore';
import {FEATURES} from '../config/env';

// `domain` (optional) applies a per-site exception (Task 9) on top of the global
// profile. Pass the active page's URL/host; omit for the global configuration.
export const buildPrivacyBundle = (domain?: string): string => {
  const eff = resolveHardening(useSettingsStore.getState(), domain);
  // Hardening off for this site (master, or a per-site 'off' exception), or
  // privacy-js disabled at build time → inject nothing.
  if (!eff.enabled || !FEATURES.privacyJs) {return '';}
  const hardening = build({
    canvasNoise: eff.toggles.canvasNoise,
    webglSpoof: eff.toggles.webglSpoof,
    navigatorHarden: eff.toggles.navigatorHarden,
    fontBlock: eff.toggles.fontBlock,
    timezoneUTC: eff.toggles.timezoneUTC,
    autoconsent: eff.toggles.autoconsent,
  });
  // Append the in-page request blocker (blocks tracker subresources that
  // onShouldStartLoadWithRequest can't see, and reports real counts). Gated on
  // the build-time content-blocking flag.
  const blocker = FEATURES.contentBlocking ? buildRequestBlocker(TRACKER_DOMAINS) : '';
  return `${hardening}\n${blocker}`;
};
