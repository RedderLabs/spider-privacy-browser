// JS wrapper for the native Safari content blocker (iOS). Feeds the compiled
// WKContentRuleList JSON from `@spider/content-blocking` into the native module,
// which compiles it with `WKContentRuleListStore` and installs it on every
// WKWebView (via the patched RNCWebViewImpl). No-ops when the native module is
// absent (Android, tests, or a build without the patch/module).
import { NativeModules } from 'react-native';

interface SpiderContentBlockerModule {
  setRules: (json: string) => void;
  setEnabled: (enabled: boolean) => void;
}

const native = NativeModules.SpiderContentBlocker as
  | SpiderContentBlockerModule
  | undefined;

export const iosContentBlocker = {
  /** Push the WKContentRuleList JSON to the native layer (call once at startup). */
  setRules(json: string): void {
    native?.setRules?.(json);
  },
  /** Turn Safari content blocking on/off (follows the master shield). */
  setEnabled(enabled: boolean): void {
    native?.setEnabled?.(enabled);
  },
  /** True when the native module is present (iOS, patched build). */
  get available(): boolean {
    return !!native;
  },
};
