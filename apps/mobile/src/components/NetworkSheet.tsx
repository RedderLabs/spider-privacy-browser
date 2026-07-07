// Quick private-network picker, opened from the home "Red directa" chip and the
// drawer's network row. A focused bottom sheet — Directa / Orbot / Mullvad — that
// applies the same selection logic as Settings (via useNetworkSelect) without
// dragging the user into the full Settings screen.
import React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NETWORK_MODE_LIST } from '@spider/network';
import { useSettingsStore } from '../store/settingsStore';
import { useNetworkStatusStore } from '../store/networkStatusStore';
import { useNetworkSelect } from '../hooks/useNetworkSelect';
import { useT } from '../i18n';
import { radius, spacing, type Palette, type Surfaces } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { OnionIcon, GlobeIcon } from './icons';

export interface NetworkSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const NetworkSheet: React.FC<NetworkSheetProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { colors, surfaces } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, surfaces), [colors, surfaces]);
  const networkMode = useSettingsStore(s => s.networkMode);
  const orbotStatus = useNetworkStatusStore(s => s.orbotStatus);
  const select = useNetworkSelect(onClose);

  // When Orbot is the active transport, its row shows the REAL tunnel state
  // instead of the generic description.
  const orbotSubtitle = (): string | null => {
    switch (orbotStatus) {
      case 'starting':
        return t('netConnecting');
      case 'on':
        return t('netConnected');
      case 'off':
      case 'stopping':
        return t('netOffline');
      default:
        return null;
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Stop propagation so taps inside the sheet don't dismiss it. */}
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('networkTitle')}</Text>

          {NETWORK_MODE_LIST.map(m => {
            const active = networkMode === m.id;
            const disabled = !m.available;
            const liveSub = m.id === 'orbot' && active ? orbotSubtitle() : null;
            const subtitle = liveSub ?? m.subtitle;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.row, active && styles.rowActive]}
                activeOpacity={0.7}
                onPress={() => select(m.id)}>
                <View style={styles.rowIcon}>
                  {m.id === 'none' ? (
                    <GlobeIcon size={22} color={active ? colors.secondary : colors.muted} />
                  ) : (
                    <OnionIcon size={22} color={active ? colors.secondary : colors.muted} />
                  )}
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{m.label}</Text>
                  <Text style={[styles.rowSub, disabled && styles.rowSubDisabled]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>
                {active ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (colors: Palette, surfaces: Surfaces) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceHigh,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: surfaces.hairline,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.outline,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.card,
    gap: spacing.sm,
  },
  rowActive: {
    backgroundColor: surfaces.cyanTint,
  },
  rowIcon: {
    width: 32,
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  rowLabelActive: {
    color: colors.secondary,
  },
  rowSub: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  rowSubDisabled: {
    color: colors.faint,
  },
  check: {
    color: colors.secondary,
    fontSize: 18,
    fontWeight: '700',
  },
});
