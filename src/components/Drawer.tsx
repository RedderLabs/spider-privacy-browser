// Custom left slide-in drawer (no react-navigation / gesture-handler — pure
// Animated + Modal). Opens from the ☰ button on the home header; the Modal gives
// us free Android back-button handling and an overlay above every screen.
//
// Faithful to the Stitch "Drawer Navigation" mockup (stitch-designs/drawer.png)
// in STRUCTURE (brand header · quick actions · SECURITY · privacy score · footer)
// but HONEST to the app's no-account/no-persistence model: it drops the mockup's
// aspirational account/Vault Sync/Bookmarks/Passkeys and shows only real state
// (the tracker-blocker master toggle, the selected network, the computed score).
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
  TouchableOpacity,
  Switch,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useSettingsStore } from '../store/settingsStore';
import { useTabStore } from '../store/tabStore';
import { colors } from '../theme/theme';
import { APP_VERSION } from '../version';
import { ShieldCheckIcon, SettingsIcon, OnionIcon, TabsIcon, GlobeIcon, InfoIcon } from './icons';

const WIDTH = Math.min(320, Dimensions.get('window').width * 0.82);
const PANEL_BG = '#141018';

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenTabs: () => void;
  onOpenAbout: () => void;
  onNewTab: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({ visible, onClose, onOpenSettings, onOpenTabs, onOpenAbout, onNewTab }) => {
  const t = useT();
  const settings = useSettingsStore();
  const tabCount = useTabStore((s) => s.tabs.length);
  const insets = useSafeAreaInsets();

  // Keep the Modal mounted through the slide-out animation.
  const [mounted, setMounted] = useState(visible);
  const tx = useRef(new Animated.Value(-WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(tx, { toValue: -WIDTH, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) {
    return null;
  }

  const isPrivate = settings.networkMode !== 'none';
  const netLabel =
    settings.networkMode === 'orbot'
      ? 'Orbot (Tor)'
      : settings.networkMode === 'mullvad'
      ? 'Mullvad WireGuard'
      : t('netDirect');

  const privacyScore = [
    settings.canvasNoise, settings.webglSpoof, settings.fontBlock,
    settings.navigatorHarden, settings.timezoneUTC, settings.autoconsent,
    settings.blockCookies, settings.noHistory,
  ].filter(Boolean).length * 12;
  const strengthLabel = privacyScore >= 80 ? t('scoreStrong') : privacyScore >= 50 ? t('scoreMedium') : t('scoreWeak');

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.panel,
            { width: WIDTH, paddingTop: insets.top + 20, transform: [{ translateX: tx }] },
          ]}>
          {/* Brand header */}
          <View style={styles.brand}>
            <Image source={require('../../logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.wordmark}>
              Spider<Text style={styles.wordmarkAccent}>Privacy</Text>
            </Text>
            <Text style={styles.tagline}>{t('homeTagline')}</Text>
          </View>

          {/* Quick actions */}
          <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={onNewTab}>
            <View style={styles.itemIcon}>
              <Text style={styles.plus}>＋</Text>
            </View>
            <Text style={styles.itemText}>{t('drawerNewTab')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={onOpenTabs}>
            <View style={styles.itemIcon}>
              <TabsIcon size={20} color={colors.onSurfaceVariant} count={tabCount} />
            </View>
            <Text style={styles.itemText}>{t('navTabs')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={onOpenSettings}>
            <View style={styles.itemIcon}>
              <SettingsIcon size={20} color={colors.onSurfaceVariant} bg={PANEL_BG} />
            </View>
            <Text style={styles.itemText}>{t('settingsTitle')}</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={onOpenAbout}>
            <View style={styles.itemIcon}>
              <InfoIcon size={20} color={colors.onSurfaceVariant} bg={PANEL_BG} />
            </View>
            <Text style={styles.itemText}>{t('aboutTitle')}</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>

          {/* Security */}
          <Text style={styles.sectionLabel}>{t('drawerSecurity')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.itemIcon}>
                <ShieldCheckIcon size={20} color={colors.primary} bg={PANEL_BG} />
              </View>
              <Text style={styles.cardRowText}>{t('drawerTrackerBlocker')}</Text>
              <Switch
                value={settings.hardeningEnabled}
                onValueChange={() => settings.toggle('hardeningEnabled')}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.primarySolid }}
                thumbColor={settings.hardeningEnabled ? '#fff' : colors.muted}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.cardRow} activeOpacity={0.7} onPress={onOpenSettings}>
              <View style={styles.itemIcon}>
                {isPrivate ? (
                  <OnionIcon size={20} color={colors.secondary} />
                ) : (
                  <GlobeIcon size={20} color={colors.muted} />
                )}
              </View>
              <View style={styles.cardRowTextWrap}>
                <Text style={styles.cardRowTitle}>{t('networkTitle')}</Text>
                <Text style={[styles.cardRowSub, isPrivate && styles.cardRowSubOn]} numberOfLines={1}>
                  {netLabel}
                </Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy score */}
          <TouchableOpacity style={styles.scoreRow} activeOpacity={0.7} onPress={onOpenSettings}>
            <View>
              <Text style={styles.scoreLabel}>{t('drawerScore')}</Text>
              <Text style={styles.scoreStrength}>{strengthLabel}</Text>
            </View>
            <Text style={styles.scoreNumber}>{privacyScore}</Text>
          </TouchableOpacity>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.footerText}>{t('drawerFooter')}</Text>
            <Text style={styles.version}>Spider Privacy · v{APP_VERSION}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.backdropWrap, { opacity: fade }]}>
          <Pressable style={styles.backdrop} onPress={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  panel: {
    height: '100%',
    backgroundColor: PANEL_BG,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    paddingTop: 52,
    paddingHorizontal: 20,
  },
  backdropWrap: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },

  brand: { alignItems: 'flex-start', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  logo: { width: 76, height: 66, marginBottom: 8, marginLeft: -6 },
  wordmark: { fontSize: 20, fontWeight: '800', color: '#f4f2f7' },
  wordmarkAccent: { color: colors.primaryBright },
  tagline: { fontSize: 12, color: colors.muted, marginTop: 4 },

  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  itemIcon: { width: 32, alignItems: 'center' },
  plus: { fontSize: 22, fontWeight: '700', color: colors.primary, lineHeight: 24 },
  itemText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.onSurface, marginLeft: 8 },
  chev: { fontSize: 22, color: colors.faint },

  sectionLabel: { fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  cardRowTextWrap: { flex: 1, marginLeft: 8 },
  cardRowText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.onSurface, marginLeft: 8 },
  cardRowTitle: { fontSize: 15, fontWeight: '600', color: colors.onSurface },
  cardRowSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  cardRowSubOn: { color: colors.secondary },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 52 },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(124,92,252,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.2)',
  },
  scoreLabel: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant },
  scoreStrength: { fontSize: 11, color: colors.muted, marginTop: 2 },
  scoreNumber: { fontSize: 30, fontWeight: '800', color: colors.primary },

  footer: { marginTop: 'auto', paddingBottom: 28 },
  footerText: { fontSize: 11, color: colors.faint, lineHeight: 16 },
  version: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 8 },
});
