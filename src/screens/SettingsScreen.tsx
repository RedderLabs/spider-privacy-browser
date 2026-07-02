import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, AppState } from 'react-native';
import { DOH_PROVIDER_LIST, NETWORK_MODE_LIST } from '@spider/network';
import type { NetworkModeId } from '@spider/network';
import { useSettingsStore } from '../store/settingsStore';
import { useTabStore } from '../store/tabStore';
import { orbot } from '../native/orbot';
import { privateDns } from '../native/privateDns';
import type { PrivateDnsStatus, DnsState } from '../native/privateDns';
import { dnsVpn } from '../native/dnsVpn';
import { useT, LANGUAGE_LIST } from '../i18n';
import type { Language, TranslationKey } from '../i18n';
import { colors } from '../theme/theme';
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

const ToggleRow: React.FC<ToggleRowProps> = ({ icon, iconBg, title, subtitle, value, onToggle }) => (
  <View style={styles.row}>
    <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={styles.rowText}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowSubtitle}>{subtitle}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#7C5CFC' }}
      thumbColor={value ? '#fff' : '#938ea1'}
      ios_backgroundColor="rgba(255,255,255,0.1)"
    />
  </View>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const settings = useSettingsStore();
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
    active: '#00e478',
    other: '#ffd479',
    auto: '#ffd479',
    off: '#ff8a80',
    unsupported: '#938ea1',
  };

  const selectNetworkMode = async (id: NetworkModeId) => {
    const mode = NETWORK_MODE_LIST.find(m => m.id === id);
    setShowNetPicker(false);

    if (mode && !mode.available) {
      Alert.alert(mode.label, t('comingSoonBody'));
      return;
    }

    if (id === 'orbot') {
      const { started, installed } = await orbot.start();
      if (!installed) {
        Alert.alert(
          t('orbotNotInstalledTitle'),
          t('orbotNotInstalledBody'),
          [
            { text: t('orbotLater'), style: 'cancel' },
            { text: t('orbotInstall'), onPress: () => orbot.openInstall() },
          ],
        );
        return; // don't switch to orbot mode until it's installed
      }
      settings.setNetworkMode('orbot');
      if (started) {
        Alert.alert(t('orbotStartedTitle'), t('orbotStartedBody'));
      }
      return;
    }

    settings.setNetworkMode(id);
  };

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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <ToggleRow icon={<CanvasIcon color={colors.primary} />} iconBg="rgba(202,190,255,0.1)"
            title={t('canvasTitle')} subtitle={t('canvasSub')}
            value={settings.canvasNoise} onToggle={() => settings.toggle('canvasNoise')} />
          <View style={styles.divider} />
          <ToggleRow icon={<MonitorIcon color={colors.primary} />} iconBg="rgba(202,190,255,0.1)"
            title={t('webglTitle')} subtitle={t('webglSub')}
            value={settings.webglSpoof} onToggle={() => settings.toggle('webglSpoof')} />
          <View style={styles.divider} />
          <ToggleRow icon={<FontIcon color={colors.primary} />} iconBg="rgba(202,190,255,0.1)"
            title={t('fontTitle')} subtitle={t('fontSub')}
            value={settings.fontBlock} onToggle={() => settings.toggle('fontBlock')} />
          <View style={styles.divider} />
          <ToggleRow icon={<DeviceIcon color={colors.primary} />} iconBg="rgba(202,190,255,0.1)"
            title={t('navigatorTitle')} subtitle={t('navigatorSub')}
            value={settings.navigatorHarden} onToggle={() => settings.toggle('navigatorHarden')} />
          <View style={styles.divider} />
          <ToggleRow icon={<ClockIcon color={colors.primary} />} iconBg="rgba(202,190,255,0.1)"
            title={t('timezoneTitle')} subtitle={t('timezoneSub')}
            value={settings.timezoneUTC} onToggle={() => settings.toggle('timezoneUTC')} />
        </View>

        <Text style={styles.sectionLabel}>{t('secCookies')}</Text>
        <View style={styles.card}>
          <ToggleRow icon={<CookieIcon color={colors.tertiary} />} iconBg="rgba(0,228,120,0.1)"
            title={t('autoconsentTitle')} subtitle={t('autoconsentSub')}
            value={settings.autoconsent} onToggle={() => settings.toggle('autoconsent')} />
        </View>

        <Text style={styles.sectionLabel}>{t('secNetwork')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setShowDohPicker(p => !p)}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(0,210,253,0.1)' }]}>
              <LockIcon color={colors.secondary} bg="#0f1a1e" />
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
              <ToggleRow icon={<KeyIcon color={colors.secondary} />} iconBg="rgba(0,210,253,0.1)"
                title={t('dohVpnTitle')} subtitle={t('dohVpnSub')}
                value={vpnRunning} onToggle={toggleDohVpn} />
            </>
          )}

          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => setShowNetPicker(p => !p)}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(0,210,253,0.1)' }]}>
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
          <ToggleRow icon={<TrashIcon color={colors.tertiary} />} iconBg="rgba(0,228,120,0.1)"
            title={t('clearTitle')} subtitle={t('clearSub')}
            value={settings.clearOnClose} onToggle={() => settings.toggle('clearOnClose')} />
          <View style={styles.divider} />
          <ToggleRow icon={<CookieIcon color={colors.tertiary} />} iconBg="rgba(0,228,120,0.1)"
            title={t('cookiesTitle')} subtitle={t('cookiesSub')}
            value={settings.blockCookies} onToggle={() => settings.toggle('blockCookies')} />
          <View style={styles.divider} />
          <ToggleRow icon={<BookIcon color={colors.tertiary} />} iconBg="rgba(0,228,120,0.1)"
            title={t('historyTitle')} subtitle={t('historySub')}
            value={settings.noHistory} onToggle={() => settings.toggle('noHistory')} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, backgroundColor: 'rgba(13,13,15,0.8)' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#cabeff', lineHeight: 32 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: 18, fontWeight: '700', color: '#cabeff', letterSpacing: -0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
  subtitle: { fontSize: 13, color: '#938ea1', lineHeight: 18, marginBottom: 20, paddingHorizontal: 4 },

  // Status card (horizontal: text + chips left, % ring right)
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(31,31,34,0.6)', borderRadius: 24, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statusText: { flex: 1, marginRight: 16 },
  statusHeading: { fontSize: 16, fontWeight: '700', color: '#e4e1e6', marginBottom: 6 },
  statusBody: { fontSize: 12, color: '#938ea1', lineHeight: 17, marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipOn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: 'rgba(0,228,120,0.12)', borderWidth: 1, borderColor: 'rgba(0,228,120,0.3)' },
  chipOnText: { fontSize: 11, fontWeight: '700', color: '#00e478' },
  chipOff: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chipOffText: { fontSize: 11, fontWeight: '700', color: '#938ea1' },
  statusRing: {
    width: 86, height: 86, borderRadius: 43, borderWidth: 6, borderColor: '#cabeff',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(202,190,255,0.05)',
  },
  statusRingLow: { borderColor: '#ffd479' },
  statusPercent: { fontSize: 22, fontWeight: '800', color: '#e4e1e6' },
  statusStrength: { fontSize: 9, color: '#938ea1', fontWeight: '700', letterSpacing: 1 },

  // Clear-all-data (destructive)
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,138,128,0.3)', backgroundColor: 'rgba(255,138,128,0.08)',
  },
  clearBtnText: { color: '#ff8a80', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#938ea1', letterSpacing: 1.5, paddingHorizontal: 4, marginBottom: 8, marginTop: 4 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(31,31,34,0.6)', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#7C5CFC' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#c9c4d8' },
  segmentTextActive: { color: '#fff', fontWeight: '700' },
  segmentHint: { fontSize: 12, color: '#938ea1', paddingHorizontal: 4, marginTop: 8, marginBottom: 20 },
  card: { backgroundColor: 'rgba(31,31,34,0.6)', borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 68 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconWrapNet: { backgroundColor: 'rgba(0,210,253,0.1)' },
  bottomSpacer: { height: 40 },

  // Private DNS status + activate
  dnsStatusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  dnsDot: { width: 8, height: 8, borderRadius: 4 },
  dnsStatusText: { fontSize: 12, color: '#c9c4d8', fontWeight: '500' },
  dnsAction: { paddingHorizontal: 16, paddingBottom: 14 },
  dnsHint: { fontSize: 12, color: '#938ea1' },
  dnsHostRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 12 },
  dnsHost: { flex: 1, fontSize: 14, color: '#00d2fd', fontWeight: '700' },
  dnsCopyBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  dnsCopyText: { color: '#c9c4d8', fontSize: 12, fontWeight: '600' },
  dnsBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,210,253,0.12)', borderWidth: 1, borderColor: 'rgba(0,210,253,0.35)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99 },
  dnsBtnText: { color: '#00d2fd', fontSize: 13, fontWeight: '600' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#e4e1e6', marginBottom: 2 },
  rowSubtitle: { fontSize: 12, color: '#938ea1' },
  chevron: { fontSize: 12, color: '#938ea1', marginLeft: 8 },
  picker: { backgroundColor: 'rgba(13,13,15,0.6)', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  pickerItemActive: { backgroundColor: 'rgba(202,190,255,0.1)' },
  pickerLabel: { fontSize: 14, fontWeight: '500', color: '#c9c4d8' },
  pickerLabelActive: { color: '#cabeff', fontWeight: '700' },
  pickerLabelDisabled: { color: '#484555' },
  pickerSubtitle: { fontSize: 11, color: '#484555', marginTop: 2 },
});
