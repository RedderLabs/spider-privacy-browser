import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, AppState } from 'react-native';
import { DOH_PROVIDER_LIST, NETWORK_MODE_LIST } from '@spider/network';
import { useSettingsStore } from '../store/settingsStore';
import { useTabStore } from '../store/tabStore';
import { useNetworkSelect } from '../hooks/useNetworkSelect';
import { privateDns } from '../native/privateDns';
import type { PrivateDnsStatus, DnsState } from '../native/privateDns';
import { dnsVpn } from '../native/dnsVpn';
import { useT, LANGUAGE_LIST } from '../i18n';
import type { Language, TranslationKey } from '../i18n';
import { alpha, type Palette, type Surfaces } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../utils/responsive';
import {
  CanvasIcon, MonitorIcon, FontIcon, DeviceIcon, ClockIcon, CookieIcon,
  TrashIcon, BookIcon, LockIcon, KeyIcon, OnionIcon, GlobeIcon, ShieldCheckIcon,
} from '../components/icons';

interface SettingsScreenProps {
  onClose: () => void;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (val: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ icon, iconBg, title, subtitle, value, onToggle }) => {
  const { colors, surfaces } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, surfaces), [colors, surfaces]);
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: alpha(colors.white, 0.1), true: colors.primarySolid }}
        thumbColor={value ? colors.white : colors.muted}
        ios_backgroundColor={alpha(colors.white, 0.1)}
      />
    </View>
  );
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const settings = useSettingsStore();
  const { colors, surfaces } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, surfaces), [colors, surfaces]);
  const r = useResponsive();
  const clearAllTabs = useTabStore((s) => s.clearAll);
  const t = useT();
  const [showDohPicker, setShowDohPicker] = React.useState(false);
  const [showNetPicker, setShowNetPicker] = React.useState(false);
  const [showLangPicker, setShowLangPicker] = React.useState(false);

  const activeNetMode = NETWORK_MODE_LIST.find(m => m.id === settings.networkMode);
  const activeLang = LANGUAGE_LIST.find(l => l.id === settings.language);
  const activeDoh = DOH_PROVIDER_LIST.find(p => p.id === settings.dohProvider);

  // Real system Private DNS (DoT) state, refreshed on mount and whenever the
  // app returns to the foreground (e.g. after the user changes it in Settings).
  const [dnsStatus, setDnsStatus] = React.useState<PrivateDnsStatus | null>(null);
  const [vpnRunning, setVpnRunning] = React.useState(false);
  const refreshDns = React.useCallback(() => {
    privateDns.getStatus().then(setDnsStatus);
    dnsVpn.isRunning().then(setVpnRunning);
  }, []);
  React.useEffect(() => {
    refreshDns();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') { refreshDns(); }
    });
    return () => sub.remove();
  }, [refreshDns]);

  const dnsState: DnsState = privateDns.resolveState(dnsStatus, activeDoh?.dot ?? '');
  const dnsStateLabelKey: Record<DnsState, TranslationKey> = {
    active: 'dnsStatusActive',
    other: 'dnsStatusOther',
    auto: 'dnsStatusAuto',
    off: 'dnsStatusOff',
    unsupported: 'dnsStatusUnsupported',
  };
  const dnsStateColor: Record<DnsState, string> = {
    active: colors.tertiary,
    other: colors.warning,
    auto: colors.warning,
    off: colors.error,
    unsupported: colors.muted,
  };

  // Shared with the quick NetworkSheet (home chip / drawer) — same Orbot/coming-soon
  // behaviour, just closes the inline picker when done.
  const selectNetworkMode = useNetworkSelect(() => setShowNetPicker(false));

  const selectLanguage = (id: Language) => {
    settings.setLanguage(id);
    setShowLangPicker(false);
  };

  const copyDnsHost = async () => {
    if (!activeDoh) { return; }
    await privateDns.copy(activeDoh.dot);
    Alert.alert(t('dnsCopiedTitle'), `${activeDoh.dot}\n\n${t('dnsCopiedBody')}`);
  };

  const activateDns = async () => {
    // Copy the host first so it's ready to paste in the settings screen.
    if (activeDoh) { await privateDns.copy(activeDoh.dot); }
    privateDns.openSettings();
  };

  const toggleDohVpn = async (val: boolean) => {
    if (val) {
      const ok = await dnsVpn.start(activeDoh?.url ?? '');
      setVpnRunning(ok);
    } else {
      await dnsVpn.stop();
      setVpnRunning(false);
    }
  };

  const privacyScore = [
    settings.canvasNoise, settings.webglSpoof, settings.fontBlock,
    settings.navigatorHarden, settings.timezoneUTC, settings.autoconsent,
    settings.blockCookies, settings.noHistory,
  ].filter(Boolean).length * 12;

  const strengthLabel = privacyScore >= 80 ? t('scoreStrong') : privacyScore >= 50 ? t('scoreMedium') : t('scoreWeak');
  const isProtected = privacyScore >= 50;
  const proxyActive = settings.networkMode !== 'none';
  // On tablets, center the settings column instead of stretching edge-to-edge.
  const contentPad = r.isTablet ? Math.max(16, (r.width - r.contentMaxWidth) / 2) : 16;

  const confirmClearData = () => {
    Alert.alert(t('clearData'), t('clearDataConfirm'), [
      { text: t('clearCancel'), style: 'cancel' },
      { text: t('clearConfirm'), style: 'destructive', onPress: () => { clearAllTabs(); onClose(); } },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <ShieldCheckIcon size={18} color={colors.primary} bg={colors.bg} />
          <Text style={styles.headerText}>{t('settingsTitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPad }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('settingsSubtitle')}</Text>

        <View style={styles.statusCard}>
          <View style={styles.statusText}>
            <Text style={styles.statusHeading}>{isProtected ? t('statusOn') : t('statusLow')}</Text>
            <Text style={styles.statusBody}>{t('statusBody')}</Text>
            <View style={styles.chipRow}>
              <View style={styles.chipOn}>
                <Text style={styles.chipOnText}>{t('chipEncrypted')}</Text>
              </View>
              <View style={proxyActive ? styles.chipOn : styles.chipOff}>
                <Text style={proxyActive ? styles.chipOnText : styles.chipOffText}>
                  {proxyActive ? t('chipProxyActive') : t('chipDirect')}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusRing, !isProtected && styles.statusRingLow]}>
            <Text style={styles.statusPercent}>{privacyScore}%</Text>
            <Text style={styles.statusStrength}>{strengthLabel.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('secProfile')}</Text>
        <View style={styles.segment}>
          {(['balanced', 'strict'] as const).map(lvl => (
            <TouchableOpacity
              key={lvl}
              style={[styles.segmentItem, settings.privacyLevel === lvl && styles.segmentItemActive]}
              onPress={() => settings.setPrivacyLevel(lvl)}
              activeOpacity={0.8}>
              <Text style={[styles.segmentText, settings.privacyLevel === lvl && styles.segmentTextActive]}>
                {lvl === 'balanced' ? t('profileBalanced') : t('profileStrict')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.segmentHint}>
          {settings.privacyLevel === 'strict'
            ? t('profileStrictSub')
            : settings.privacyLevel === 'custom'
            ? t('profileCustom')
            : t('profileBalancedSub')}
        </Text>

        <Text style={styles.sectionLabel}>{t('secFingerprint')}</Text>
        <View style={styles.card}>
          <ToggleRow icon={<CanvasIcon color={colors.primary} />} iconBg={alpha(colors.primary, 0.1)}
            title={t('canvasTitle')} subtitle={t('canvasSub')}
            value={settings.canvasNoise} onToggle={() => settings.toggle('canvasNoise')} />
          <View style={styles.divider} />
          <ToggleRow icon={<MonitorIcon color={colors.primary} />} iconBg={alpha(colors.primary, 0.1)}
            title={t('webglTitle')} subtitle={t('webglSub')}
            value={settings.webglSpoof} onToggle={() => settings.toggle('webglSpoof')} />
          <View style={styles.divider} />
          <ToggleRow icon={<FontIcon color={colors.primary} />} iconBg={alpha(colors.primary, 0.1)}
            title={t('fontTitle')} subtitle={t('fontSub')}
            value={settings.fontBlock} onToggle={() => settings.toggle('fontBlock')} />
          <View style={styles.divider} />
          <ToggleRow icon={<DeviceIcon color={colors.primary} />} iconBg={alpha(colors.primary, 0.1)}
            title={t('navigatorTitle')} subtitle={t('navigatorSub')}
            value={settings.navigatorHarden} onToggle={() => settings.toggle('navigatorHarden')} />
          <View style={styles.divider} />
          <ToggleRow icon={<ClockIcon color={colors.primary} />} iconBg={alpha(colors.primary, 0.1)}
            title={t('timezoneTitle')} subtitle={t('timezoneSub')}
            value={settings.timezoneUTC} onToggle={() => settings.toggle('timezoneUTC')} />
        </View>

        <Text style={styles.sectionLabel}>{t('secCookies')}</Text>
        <View style={styles.card}>
          <ToggleRow icon={<CookieIcon color={colors.tertiary} />} iconBg={alpha(colors.tertiary, 0.1)}
            title={t('autoconsentTitle')} subtitle={t('autoconsentSub')}
            value={settings.autoconsent} onToggle={() => settings.toggle('autoconsent')} />
        </View>

        <Text style={styles.sectionLabel}>{t('secNetwork')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setShowDohPicker(p => !p)}>
            <View style={[styles.iconWrap, { backgroundColor: surfaces.cyanTint }]}>
              <LockIcon color={colors.secondary} bg={colors.surface} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t('dohTitle')}</Text>
              <Text style={styles.rowSubtitle}>
                {DOH_PROVIDER_LIST.find(p => p.id === settings.dohProvider)?.label}
              </Text>
            </View>
            <Text style={styles.chevron}>{showDohPicker ? '▲' : '▶'}</Text>
          </TouchableOpacity>

          {showDohPicker && (
            <View style={styles.picker}>
              {DOH_PROVIDER_LIST.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pickerItem, settings.dohProvider === p.id && styles.pickerItemActive]}
                  onPress={() => { settings.setDohProvider(p.id); setShowDohPicker(false); }}>
                  <Text style={[styles.pickerLabel, settings.dohProvider === p.id && styles.pickerLabelActive]}>
                    {p.label}
                  </Text>
                  <Text style={styles.pickerSubtitle}>{p.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.dnsStatusRow}>
            <View style={[styles.dnsDot, { backgroundColor: dnsStateColor[dnsState] }]} />
            <Text style={styles.dnsStatusText}>{t(dnsStateLabelKey[dnsState])}</Text>
          </View>
          {dnsState !== 'active' && dnsState !== 'unsupported' && (
            <View style={styles.dnsAction}>
              <Text style={styles.dnsHint}>{t('dnsHostHint')}</Text>
              <View style={styles.dnsHostRow}>
                <Text style={styles.dnsHost} selectable numberOfLines={1}>{activeDoh?.dot}</Text>
                <TouchableOpacity style={styles.dnsCopyBtn} onPress={copyDnsHost} activeOpacity={0.8}>
                  <Text style={styles.dnsCopyText}>⧉ {t('dnsCopy')}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.dnsBtn} onPress={activateDns} activeOpacity={0.8}>
                <Text style={styles.dnsBtnText}>{t('dnsActivate')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {dnsVpn.supported && (
            <>
              <View style={styles.divider} />
              <ToggleRow icon={<KeyIcon color={colors.secondary} />} iconBg={surfaces.cyanTint}
                title={t('dohVpnTitle')} subtitle={t('dohVpnSub')}
                value={vpnRunning} onToggle={toggleDohVpn} />
            </>
          )}

          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => setShowNetPicker(p => !p)}>
            <View style={[styles.iconWrap, { backgroundColor: surfaces.cyanTint }]}>
              <OnionIcon color={colors.secondary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t('networkTitle')}</Text>
              <Text style={styles.rowSubtitle}>{activeNetMode?.label ?? '—'}</Text>
            </View>
            <Text style={styles.chevron}>{showNetPicker ? '▲' : '▶'}</Text>
          </TouchableOpacity>

          {showNetPicker && (
            <View style={styles.picker}>
              {NETWORK_MODE_LIST.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.pickerItem, settings.networkMode === m.id && styles.pickerItemActive]}
                  onPress={() => selectNetworkMode(m.id)}>
                  <Text style={[
                    styles.pickerLabel,
                    settings.networkMode === m.id && styles.pickerLabelActive,
                    !m.available && styles.pickerLabelDisabled,
                  ]}>
                    {m.label}{!m.available ? (settings.language === 'en' ? ' · coming soon' : ' · próximamente') : ''}
                  </Text>
                  <Text style={styles.pickerSubtitle}>{m.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>{t('secSession')}</Text>
        <View style={styles.card}>
          <ToggleRow icon={<TrashIcon color={colors.tertiary} />} iconBg={alpha(colors.tertiary, 0.1)}
            title={t('clearTitle')} subtitle={t('clearSub')}
            value={settings.clearOnClose} onToggle={() => settings.toggle('clearOnClose')} />
          <View style={styles.divider} />
          <ToggleRow icon={<CookieIcon color={colors.tertiary} />} iconBg={alpha(colors.tertiary, 0.1)}
            title={t('cookiesTitle')} subtitle={t('cookiesSub')}
            value={settings.blockCookies} onToggle={() => settings.toggle('blockCookies')} />
          <View style={styles.divider} />
          <ToggleRow icon={<BookIcon color={colors.tertiary} />} iconBg={alpha(colors.tertiary, 0.1)}
            title={t('historyTitle')} subtitle={t('historySub')}
            value={settings.noHistory} onToggle={() => settings.toggle('noHistory')} />
        </View>

        <Text style={styles.sectionLabel}>{t('secAppearance')}</Text>
        <View style={[styles.segment, styles.appearanceSegment]}>
          {(['system', 'light', 'dark'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.segmentItem, settings.themeMode === mode && styles.segmentItemActive]}
              onPress={() => settings.setThemeMode(mode)}
              activeOpacity={0.8}>
              <Text style={[styles.segmentText, settings.themeMode === mode && styles.segmentTextActive]}>
                {mode === 'system' ? t('themeSystem') : mode === 'light' ? t('themeLight') : t('themeDark')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t('secLanguage')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setShowLangPicker(p => !p)}>
            <View style={[styles.iconWrap, styles.iconWrapNet]}>
              <GlobeIcon color={colors.secondary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t('langTitle')}</Text>
              <Text style={styles.rowSubtitle}>{activeLang?.label}</Text>
            </View>
            <Text style={styles.chevron}>{showLangPicker ? '▲' : '▶'}</Text>
          </TouchableOpacity>

          {showLangPicker && (
            <View style={styles.picker}>
              {LANGUAGE_LIST.map(l => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.pickerItem, settings.language === l.id && styles.pickerItemActive]}
                  onPress={() => selectLanguage(l.id)}>
                  <Text style={[styles.pickerLabel, settings.language === l.id && styles.pickerLabelActive]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.clearBtn} onPress={confirmClearData} activeOpacity={0.8}>
          <TrashIcon size={16} color={colors.error} />
          <Text style={styles.clearBtnText}>{t('clearData')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: Palette, surfaces: Surfaces) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, backgroundColor: alpha(colors.bg, 0.8) },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: colors.primary, lineHeight: 32 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: 18, fontWeight: '700', color: colors.primary, letterSpacing: -0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
  subtitle: { fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 20, paddingHorizontal: 4 },

  // Status card (horizontal: text + chips left, % ring right)
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: surfaces.card, borderRadius: 24, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: surfaces.hairline,
  },
  statusText: { flex: 1, marginRight: 16 },
  statusHeading: { fontSize: 16, fontWeight: '700', color: colors.onSurface, marginBottom: 6 },
  statusBody: { fontSize: 12, color: colors.muted, lineHeight: 17, marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipOn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: alpha(colors.tertiary, 0.12), borderWidth: 1, borderColor: alpha(colors.tertiary, 0.3) },
  chipOnText: { fontSize: 11, fontWeight: '700', color: colors.tertiary },
  chipOff: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: surfaces.divider, borderWidth: 1, borderColor: alpha(colors.white, 0.12) },
  chipOffText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  statusRing: {
    width: 86, height: 86, borderRadius: 43, borderWidth: 6, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(colors.primary, 0.05),
  },
  statusRingLow: { borderColor: colors.warning },
  statusPercent: { fontSize: 22, fontWeight: '800', color: colors.onSurface },
  statusStrength: { fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 1 },

  // Clear-all-data (destructive)
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: alpha(colors.error, 0.3), backgroundColor: alpha(colors.error, 0.08),
  },
  clearBtnText: { color: colors.error, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 1.5, paddingHorizontal: 4, marginBottom: 8, marginTop: 4 },
  segment: { flexDirection: 'row', backgroundColor: surfaces.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: surfaces.hairline },
  appearanceSegment: { marginBottom: 20 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.primarySolid },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.onSurfaceVariant },
  segmentTextActive: { color: colors.white, fontWeight: '700' },
  segmentHint: { fontSize: 12, color: colors.muted, paddingHorizontal: 4, marginTop: 8, marginBottom: 20 },
  card: { backgroundColor: surfaces.card, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: surfaces.hairline, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: surfaces.divider, marginLeft: 68 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconWrapNet: { backgroundColor: surfaces.cyanTint },
  bottomSpacer: { height: 40 },

  // Private DNS status + activate
  dnsStatusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  dnsDot: { width: 8, height: 8, borderRadius: 4 },
  dnsStatusText: { fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '500' },
  dnsAction: { paddingHorizontal: 16, paddingBottom: 14 },
  dnsHint: { fontSize: 12, color: colors.muted },
  dnsHostRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 12 },
  dnsHost: { flex: 1, fontSize: 14, color: colors.secondary, fontWeight: '700' },
  dnsCopyBtn: { backgroundColor: alpha(colors.white, 0.06), borderWidth: 1, borderColor: alpha(colors.white, 0.12), paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  dnsCopyText: { color: colors.onSurfaceVariant, fontSize: 12, fontWeight: '600' },
  dnsBtn: { alignSelf: 'flex-start', backgroundColor: alpha(colors.secondary, 0.12), borderWidth: 1, borderColor: alpha(colors.secondary, 0.35), paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99 },
  dnsBtnText: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.onSurface, marginBottom: 2 },
  rowSubtitle: { fontSize: 12, color: colors.muted },
  chevron: { fontSize: 12, color: colors.muted, marginLeft: 8 },
  picker: { backgroundColor: alpha(colors.bg, 0.6), marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: alpha(colors.white, 0.06) },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: surfaces.divider },
  pickerItemActive: { backgroundColor: alpha(colors.primary, 0.1) },
  pickerLabel: { fontSize: 14, fontWeight: '500', color: colors.onSurfaceVariant },
  pickerLabelActive: { color: colors.primary, fontWeight: '700' },
  pickerLabelDisabled: { color: colors.outline },
  pickerSubtitle: { fontSize: 11, color: colors.outline, marginTop: 2 },
});
