// Runtime (non-persisted) private-network status + UI flags. Separate from
// settingsStore because this is live device state — the REAL tunnel status
// reported by Orbot / WireGuard — plus transient UI (the WireGuard config sheet),
// not a user preference. Reset on each launch; never saved.
import { create } from 'zustand';
import type { OrbotStatus } from '../native/orbot';
import type { WireGuardState } from '../native/wireguard';

interface NetworkStatusState {
  orbotStatus: OrbotStatus;
  setOrbotStatus: (status: OrbotStatus) => void;
  wireguardState: WireGuardState;
  setWireguardState: (state: WireGuardState) => void;
  // The WireGuard config/connect sheet (opened from the network selector).
  wgSheetOpen: boolean;
  setWgSheetOpen: (open: boolean) => void;
}

export const useNetworkStatusStore = create<NetworkStatusState>((set) => ({
  orbotStatus: 'unknown',
  setOrbotStatus: (status) => set({ orbotStatus: status }),
  wireguardState: 'unknown',
  setWireguardState: (state) => set({ wireguardState: state }),
  wgSheetOpen: false,
  setWgSheetOpen: (open) => set({ wgSheetOpen: open }),
}));
