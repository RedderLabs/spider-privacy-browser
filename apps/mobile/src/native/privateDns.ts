// JS wrapper around the native PrivateDns bridge (Android only).
//
// Android WebView uses the system DNS, so encrypted DNS for the browser means
// the OS "Private DNS" (DoT) setting. We can read its real state and open the
// settings screen, but not toggle it (needs a system permission). On iOS there
// is no equivalent read, so calls degrade gracefully.
import { NativeModules, Platform } from 'react-native';

export type PrivateDnsMode = 'off' | 'opportunistic' | 'hostname' | 'unknown';

export interface PrivateDnsStatus {
  mode: PrivateDnsMode;
  hostname: string;
}

/** UI-facing status relative to the provider the user picked. */
export type DnsState =
  | 'active' // Private DNS on, hostname matches the selected provider
  | 'other' // Private DNS on with a different hostname
  | 'auto' // opportunistic (encrypted if the resolver supports it, not enforced)
  | 'off' // no encrypted DNS
  | 'unsupported'; // no native bridge (iOS / older)

interface PrivateDnsNative {
  getStatus(): Promise<PrivateDnsStatus>;
  openSettings(): Promise<boolean>;
  copyToClipboard(text: string): Promise<boolean>;
}

const native: PrivateDnsNative | undefined =
  Platform.OS === 'android' ? NativeModules.PrivateDns : undefined;

export const privateDns = {
  async getStatus(): Promise<PrivateDnsStatus | null> {
    if (!native) { return null; }
    try {
      return await native.getStatus();
    } catch {
      return null;
    }
  },

  async openSettings(): Promise<void> {
    if (native) {
      try {
        await native.openSettings();
      } catch {
        // ignore
      }
    }
  },

  /** Copy the DoT hostname to the clipboard so the user can paste it. */
  async copy(text: string): Promise<boolean> {
    if (!native) { return false; }
    try {
      await native.copyToClipboard(text);
      return true;
    } catch {
      return false;
    }
  },

  /** Map the raw status against the selected provider's DoT hostname. */
  resolveState(status: PrivateDnsStatus | null, selectedDot: string): DnsState {
    if (!status) { return 'unsupported'; }
    switch (status.mode) {
      case 'hostname':
        return status.hostname === selectedDot ? 'active' : 'other';
      case 'opportunistic':
        return 'auto';
      case 'off':
        return 'off';
      default:
        return 'off';
    }
  },
};
