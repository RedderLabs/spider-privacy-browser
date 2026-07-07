// JS wrapper around the native WireGuard bridge (Android only).
//
// Imports a standard WireGuard `.conf` and brings a real tunnel up/down via the
// wireguard-android GoBackend (its own VpnService). Generic — the user pastes a
// config from Mullvad or any provider; we embed no account. On iOS there is no
// bridge, so every call degrades gracefully.
import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';

export type WireGuardState = 'up' | 'down' | 'unknown';

export interface ImportResult {
  ok: boolean;
  /** First peer endpoint (host:port), for the UI to confirm the config. */
  endpoint: string;
  /** Interface addresses assigned by the config. */
  addresses: string;
}

interface WireGuardNative {
  importConfig(text: string): Promise<ImportResult>;
  hasConfig(): Promise<boolean>;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  getStatus(): Promise<'up' | 'down'>;
}

const native: WireGuardNative | undefined =
  Platform.OS === 'android' ? NativeModules.WireGuard : undefined;

const EVENT_STATE = 'wireguardState';

export const wireguard = {
  /** True only when the native bridge exists (Android). */
  isSupported(): boolean {
    return !!native;
  },

  /** Parse + store a config for this session. Rejects on invalid config. */
  async importConfig(text: string): Promise<ImportResult> {
    if (!native) {
      throw new Error('WireGuard is only available on Android');
    }
    return native.importConfig(text);
  },

  /** True if a config was imported this session. */
  async hasConfig(): Promise<boolean> {
    if (!native) {
      return false;
    }
    try {
      return await native.hasConfig();
    } catch {
      return false;
    }
  },

  /** Bring the tunnel up (requests VPN consent on first use). */
  async connect(): Promise<void> {
    if (!native) {
      throw new Error('WireGuard is only available on Android');
    }
    await native.connect();
  },

  /** Bring the tunnel down. */
  async disconnect(): Promise<void> {
    if (native) {
      try {
        await native.disconnect();
      } catch {
        // ignore — best-effort teardown
      }
    }
  },

  /** One-shot current state. */
  async getStatus(): Promise<WireGuardState> {
    if (!native) {
      return 'unknown';
    }
    try {
      return await native.getStatus();
    } catch {
      return 'unknown';
    }
  },

  /** Subscribe to tunnel state changes ("up" | "down"). Returns unsubscribe. */
  subscribeState(cb: (state: WireGuardState) => void): () => void {
    if (!native) {
      return () => {};
    }
    const sub = DeviceEventEmitter.addListener(EVENT_STATE, (raw: string) =>
      cb(raw === 'up' ? 'up' : 'down'),
    );
    return () => sub.remove();
  },
};
