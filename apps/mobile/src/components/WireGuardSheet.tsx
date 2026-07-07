// WireGuard config + connect sheet. Opened from the private-network selector
// when the user picks "WireGuard". Paste a standard .conf (Mullvad or any
// provider), import + connect (VPN consent handled natively), or disconnect an
// active tunnel. Session-only: the config is never persisted (incognito-pure).
import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/settingsStore';
import { useNetworkStatusStore } from '../store/networkStatusStore';
import { wireguard } from '../native/wireguard';
import { useT } from '../i18n';
import { radius, spacing, alpha, type Palette, type Surfaces } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

export const WireGuardSheet: React.FC = () => {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { colors, surfaces } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, surfaces), [colors, surfaces]);

  const visible = useNetworkStatusStore(s => s.wgSheetOpen);
  const close = useNetworkStatusStore(s => s.setWgSheetOpen);
  const wgState = useNetworkStatusStore(s => s.wireguardState);
  const setNetworkMode = useSettingsStore(s => s.setNetworkMode);

  const [config, setConfig] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [endpoint, setEndpoint] = React.useState('');

  const connected = wgState === 'up';

  const onImportConnect = async () => {
    const text = config.trim();
    if (!text || busy) {
      return;
    }
    setBusy(true);
    try {
      const res = await wireguard.importConfig(text);
      setEndpoint(res.endpoint);
      await wireguard.connect();
      setNetworkMode('mullvad');
      setConfig('');
      close(false);
    } catch (e: unknown) {
      const msg = String(e);
      // A parse failure vs. a bring-up failure get different guidance.
      const parse = msg.includes('WG_PARSE_FAILED') || msg.includes('Invalid');
      Alert.alert(
        parse ? t('wgInvalidTitle') : t('wgFailedTitle'),
        parse ? t('wgInvalidBody') : t('wgFailedBody'),
      );
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await wireguard.disconnect();
      setNetworkMode('none');
      close(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => close(false)}>
      <Pressable style={styles.backdrop} onPress={() => close(false)}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('wgTitle')}</Text>

          {connected ? (
            <>
              <View style={styles.statusRow}>
                <View style={styles.dot} />
                <Text style={styles.statusText}>{t('wgConnected')}</Text>
              </View>
              {endpoint ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {t('wgServer')}: {endpoint}
                </Text>
              ) : null}
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger]}
                activeOpacity={0.8}
                disabled={busy}
                onPress={onDisconnect}>
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>{t('wgDisconnect')}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.hint}>{t('wgPasteHint')}</Text>
              <TextInput
                style={styles.input}
                value={config}
                onChangeText={setConfig}
                placeholder={t('wgPlaceholder')}
                placeholderTextColor={colors.faint}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, (!config.trim() || busy) && styles.btnDisabled]}
                activeOpacity={0.8}
                disabled={!config.trim() || busy}
                onPress={onImportConnect}>
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>{t('wgImportConnect')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.close} activeOpacity={0.7} onPress={() => close(false)}>
            <Text style={styles.closeText}>{t('wgClose')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (colors: Palette, surfaces: Surfaces) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
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
  title: { color: colors.onSurface, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  hint: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
  input: {
    minHeight: 150,
    maxHeight: 260,
    color: colors.onSurface,
    backgroundColor: alpha(colors.surfaceContainer, 0.85),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: surfaces.hairline,
    padding: spacing.sm,
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: spacing.md,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.tertiary },
  statusText: { color: colors.tertiary, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, marginBottom: spacing.md },
  btn: { height: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primarySolid },
  btnDanger: { backgroundColor: colors.primarySolid },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  close: { alignItems: 'center', paddingVertical: spacing.md, marginTop: 4 },
  closeText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
});
