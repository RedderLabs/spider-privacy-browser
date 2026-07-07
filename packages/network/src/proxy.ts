// Private-network transport options. Single source of truth for the "Red
// privada" selector: what the app can route traffic through beyond plain DoH.
//
// Only `orbot` is functional today (it delegates to the installed Orbot app,
// which owns the Android VpnService / Tor SOCKS proxy — we never build our own
// tunnel). `mullvad` is the WireGuard path documented in the roadmap (Phase 5)
// and is surfaced as "próximamente" until the native VpnService lands.

export type NetworkModeId = 'none' | 'orbot' | 'mullvad';

export interface NetworkModeInfo {
  id: NetworkModeId;
  label: string;
  subtitle: string;
  /** false → shown in the picker but not yet wired to a working backend. */
  available: boolean;
}

// Orbot integration constants (Android). Orbot exposes both a system VPN
// (captures all traffic) and local proxies. We launch it via intent and read
// its status; we do not configure the proxy inside react-native-webview
// (that needs per-app SOCKS support the RN WebView doesn't expose).
export const ORBOT = {
  /** Play Store / F-Droid package id of the Guardian Project Orbot app. */
  packageId: 'org.torproject.android',
  /** Broadcast/intent action Orbot listens on to start Tor. */
  actionStart: 'org.torproject.android.intent.action.START',
  /** Extra Orbot sends back with its status ("ON" | "OFF" | "STARTING"). */
  extraStatus: 'org.torproject.android.intent.extra.STATUS',
  /** Local Tor SOCKS5 proxy Orbot listens on when running. */
  socks: {host: '127.0.0.1', port: 9050},
  /** Local HTTP proxy (Privoxy) Orbot can expose. */
  http: {host: '127.0.0.1', port: 8118},
  /** Where to send the user to install Orbot if it is missing. */
  installUrl: 'https://play.google.com/store/apps/details?id=org.torproject.android',
} as const;

export const NETWORK_MODE_LIST: NetworkModeInfo[] = [
  {
    id: 'none',
    label: 'Directa',
    subtitle: 'Sin túnel — solo DoH cifra el DNS',
    available: true,
  },
  {
    id: 'orbot',
    label: 'Orbot (Tor)',
    subtitle: 'Enruta todo el tráfico por la red Tor',
    available: true,
  },
  {
    id: 'mullvad',
    label: 'WireGuard',
    subtitle: 'Importa una configuración (Mullvad u otra)',
    available: true,
  },
];
