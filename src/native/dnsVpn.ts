// JS wrapper around the in-app DoH VpnService (Android only).
//
// Starts a local DNS-only VPN that resolves DNS over HTTPS to the selected
// provider — encrypted DNS for the whole device without leaving the app. The
// first start triggers Android's VPN consent dialog. On iOS there is no bridge,
// so calls degrade gracefully.
import { NativeModules, Platform } from 'react-native';

interface DnsVpnNative {
  isRunning(): Promise<boolean>;
  start(dohUrl: string): Promise<boolean>;
  stop(): Promise<boolean>;
}

const native: DnsVpnNative | undefined =
  Platform.OS === 'android' ? NativeModules.DnsVpn : undefined;

export const dnsVpn = {
  supported: !!native,

  async isRunning(): Promise<boolean> {
    if (!native) { return false; }
    try {
      return await native.isRunning();
    } catch {
      return false;
    }
  },

  /** Start the DoH VPN. Returns true if started/approved, false if declined. */
  async start(dohUrl: string): Promise<boolean> {
    if (!native) { return false; }
    try {
      return await native.start(dohUrl);
    } catch {
      return false;
    }
  },

  async stop(): Promise<void> {
    if (!native) { return; }
    try {
      await native.stop();
    } catch {
      // ignore
    }
  },
};
