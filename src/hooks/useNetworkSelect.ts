// Shared private-network selection logic, so both the full Settings screen and
// the quick NetworkSheet (opened from the home "Red directa" chip / drawer) apply
// the exact same behaviour: unavailable modes show a "coming soon" alert, Orbot
// launches Tor (or offers to install it) before switching, and everything else
// just sets the mode. Pass an `onDone` to close the surface that invoked it.
import { Alert } from 'react-native';
import { NETWORK_MODE_LIST, type NetworkModeId } from '@spider/network';
import { useSettingsStore } from '../store/settingsStore';
import { orbot } from '../native/orbot';
import { useT } from '../i18n';

export function useNetworkSelect(onDone?: () => void) {
  const setNetworkMode = useSettingsStore(s => s.setNetworkMode);
  const t = useT();

  return async (id: NetworkModeId): Promise<void> => {
    const mode = NETWORK_MODE_LIST.find(m => m.id === id);
    onDone?.();

    if (mode && !mode.available) {
      Alert.alert(mode.label, t('comingSoonBody'));
      return;
    }

    if (id === 'orbot') {
      const { started, installed } = await orbot.start();
      if (!installed) {
        Alert.alert(t('orbotNotInstalledTitle'), t('orbotNotInstalledBody'), [
          { text: t('orbotLater'), style: 'cancel' },
          { text: t('orbotInstall'), onPress: () => orbot.openInstall() },
        ]);
        return; // don't switch to orbot mode until it's installed
      }
      setNetworkMode('orbot');
      if (started) {
        Alert.alert(t('orbotStartedTitle'), t('orbotStartedBody'));
      }
      return;
    }

    setNetworkMode(id);
  };
}
