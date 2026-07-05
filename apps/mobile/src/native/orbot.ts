// JS wrapper around the native Orbot bridge (Android only).
//
// On Android the `Orbot` native module (OrbotModule.kt) detects/launches the
// Guardian Project Orbot app, which owns the system VpnService that tunnels all
// traffic through Tor. On iOS there is no equivalent app-to-app VPN handoff, so
// these calls degrade gracefully (isInstalled → false, start → not installed)
// and callers fall back to opening the install page via Linking.
import { NativeModules, Linking, Platform } from 'react-native';
import { ORBOT } from '@spider/network';

interface StartResult {
  started: boolean;
  installed: boolean;
}

interface OrbotNative {
  isInstalled(): Promise<boolean>;
  start(): Promise<StartResult>;
  openApp(): Promise<boolean>;
  openInstall(): Promise<boolean>;
}

const native: OrbotNative | undefined =
  Platform.OS === 'android' ? NativeModules.Orbot : undefined;

export const orbot = {
  /** True only when the native bridge exists and Orbot is installed. */
  async isInstalled(): Promise<boolean> {
    if (!native) {return false;}
    try {
      return await native.isInstalled();
    } catch {
      return false;
    }
  },

  /**
   * Start Tor via Orbot. Returns whether it was started and whether Orbot is
   * installed, so the UI can prompt to install when missing.
   */
  async start(): Promise<StartResult> {
    if (!native) {return { started: false, installed: false };}
    return native.start();
  },

  /** Bring the Orbot app to the foreground so the user can confirm the tunnel. */
  async openApp(): Promise<void> {
    if (native) {
      try {
        await native.openApp();
        return;
      } catch {
        // fall through to store page
      }
    }
    await Linking.openURL(ORBOT.installUrl);
  },

  /** Open the store page to install Orbot. */
  async openInstall(): Promise<void> {
    if (native) {
      try {
        await native.openInstall();
        return;
      } catch {
        // fall through
      }
    }
    await Linking.openURL(ORBOT.installUrl);
  },
};
