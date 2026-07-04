// JS wrapper for the native subresource blocker (Android). Feeds the domain list
// from `@spider/network` (single source of truth) into the native module, which
// the patched RNCWebViewClient queries in `shouldInterceptRequest`. No-ops when
// the native module is absent (iOS, tests, or a non-patched build).
import { NativeModules } from 'react-native';

interface NativeBlocklistModule {
  setDomains: (domains: string[]) => void;
  setEnabled: (enabled: boolean) => void;
}

const native = NativeModules.NativeBlocklist as NativeBlocklistModule | undefined;

export const nativeBlocklist = {
  /** Push the tracker domain list to the native layer (call once at startup). */
  setDomains(domains: string[]): void {
    native?.setDomains?.(domains);
  },
  /** Turn native subresource blocking on/off (follows the master shield). */
  setEnabled(enabled: boolean): void {
    native?.setEnabled?.(enabled);
  },
  /** True when the native module is present (Android, patched build). */
  get available(): boolean {
    return !!native;
  },
};
