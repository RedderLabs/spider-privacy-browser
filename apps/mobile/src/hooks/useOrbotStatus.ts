// Wires Orbot's native status broadcasts into the runtime networkStatusStore, so
// any surface (home chip, network sheet) can read the REAL tunnel state. Mounted
// once at the app root. Android-only; on iOS orbot.subscribeStatus is a no-op.
import React from 'react';
import { orbot } from '../native/orbot';
import { useNetworkStatusStore } from '../store/networkStatusStore';

export function useOrbotStatus(): void {
  const setOrbotStatus = useNetworkStatusStore((s) => s.setOrbotStatus);
  React.useEffect(() => {
    const unsubscribe = orbot.subscribeStatus(setOrbotStatus);
    return unsubscribe;
  }, [setOrbotStatus]);
}
