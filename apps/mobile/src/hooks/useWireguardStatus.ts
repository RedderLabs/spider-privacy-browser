// Wires the native WireGuard tunnel state into the runtime networkStatusStore,
// so the network chip/selector reflect the real tunnel. Mounted once at the app
// root. Android-only; on iOS wireguard.subscribeState is a no-op.
import React from 'react';
import { wireguard } from '../native/wireguard';
import { useNetworkStatusStore } from '../store/networkStatusStore';

export function useWireguardStatus(): void {
  const setWireguardState = useNetworkStatusStore((s) => s.setWireguardState);
  React.useEffect(() => {
    const unsubscribe = wireguard.subscribeState(setWireguardState);
    wireguard.getStatus().then(setWireguardState).catch(() => {});
    return unsubscribe;
  }, [setWireguardState]);
}
