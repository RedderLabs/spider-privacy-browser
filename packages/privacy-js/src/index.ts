// @spider/privacy-js — single source of truth for the fingerprint-hardening
// bundle. Pure and config-driven: it has NO dependency on the app or its store.
// The app (src/privacy/bundle.ts) reads its settings and passes them in here.
import {canvasHardening} from './canvas';
import {webglHardening} from './webgl';
import {navigatorHardening} from './navigator';
import {fontHardening} from './fonts';
import {timezoneHardening} from './timezone';
import {toStringCloak} from './tostring';
import {autoconsentScript} from './autoconsent';

export {
  canvasHardening,
  webglHardening,
  navigatorHardening,
  fontHardening,
  timezoneHardening,
  toStringCloak,
  autoconsentScript,
};

// Coherent spoofed device identity (UA + navigator.* must agree).
export {USER_AGENT, DEVICE} from './device';

// In-page tracker request blocker (config-driven; app supplies the domain list).
export {buildRequestBlocker} from './blocker';

export interface PrivacyConfig {
  canvasNoise: boolean;
  webglSpoof: boolean;
  navigatorHarden: boolean;
  fontBlock: boolean;
  timezoneUTC: boolean;
  autoconsent: boolean;
}

/**
 * Assemble the injected JS string from the enabled defenses only. The result is
 * a single IIFE meant for `injectedJavaScriptBeforeContentLoaded`. It must stay
 * self-contained: no imports, no reliance on React Native globals.
 */
export const buildPrivacyBundle = (config: PrivacyConfig): string => {
  const parts: string[] = [];

  if (config.canvasNoise) {parts.push(canvasHardening);}
  if (config.webglSpoof) {parts.push(webglHardening);}
  if (config.navigatorHarden) {parts.push(navigatorHardening);}
  if (config.fontBlock) {parts.push(fontHardening);}
  if (config.timezoneUTC) {parts.push(timezoneHardening);}
  // The toString cloak only matters when canvas/webgl methods were replaced.
  if (config.canvasNoise || config.webglSpoof) {parts.push(toStringCloak);}
  if (config.autoconsent) {parts.push(autoconsentScript);}

  return `(function() {\n${parts.join('\n')}\n})();`;
};
