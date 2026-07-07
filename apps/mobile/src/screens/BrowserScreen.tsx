// src/screens/BrowserScreen.tsx
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  BackHandler,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HardenedWebViewHandle, LoadErrorInfo } from '../components/HardenedWebView';
import { BrowserEngine } from '../components/BrowserEngine';
import { HomeContent } from './HomeContent';
import { useTabStore } from '../store/tabStore';
import { useSettingsStore, normalizeDomain, SiteExceptionMode } from '../store/settingsStore';
import { captureRef } from 'react-native-view-shot';
import { useT } from '../i18n';
import { alpha, type Palette, type Surfaces } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { ShieldCheckIcon, LockIcon, WarnIcon, BackIcon, ForwardIcon, MenuIcon, HomeIcon, TabsIcon, MoreIcon } from '../components/icons';
import type { WebViewNavigation } from 'react-native-webview';

interface Tab {
  id: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  trackersBlocked: number;
  blockedDomains: Record<string, number>;
  preview?: string;
}

interface BrowserScreenProps {
  activeTab: Tab | null;
  onOpenTabs: () => void;
  onOpenNetwork: () => void;
  onOpenDrawer: () => void;
}

export const BrowserScreen: React.FC<BrowserScreenProps> = ({
  activeTab,
  onOpenTabs,
  onOpenNetwork,
  onOpenDrawer,
}) => {
  const { tabs, updateTab, recordBlocked, addTab } = useTabStore();
  const globalShield = useSettingsStore((s) => s.hardeningEnabled);
  const siteExceptions = useSettingsStore((s) => s.siteExceptions);
  const setSiteException = useSettingsStore((s) => s.setSiteException);
  const toggleSetting = useSettingsStore((s) => s.toggle);
  const t = useT();
  const { colors, surfaces } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, surfaces), [colors, surfaces]);
  const [addressInput, setAddressInput] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showSiteSheet, setShowSiteSheet] = useState(false);
  const [loadError, setLoadError] = useState<LoadErrorInfo | null>(null);
  const [capturing, setCapturing] = useState(false);
  const webViewRef = useRef<HardenedWebViewHandle>(null);
  const webShotRef = useRef<View>(null);
  const insets = useSafeAreaInsets();

  // The native subresource blocker (patched WebView client) reports each blocked
  // tracker host; attribute it to the active tab's counter, like the in-page
  // blocker's postMessage does.
  const activeTabId = activeTab?.id;
  React.useEffect(() => {
    if (!activeTabId) {return;}
    const sub = DeviceEventEmitter.addListener(
      'spiderNativeBlocked',
      (e: { domain?: string }) => recordBlocked(activeTabId, e?.domain),
    );
    return () => sub.remove();
  }, [activeTabId, recordBlocked]);

  // Per-site hardening state for the active domain (Task 9). The top status
  // badge reflects the EFFECTIVE state for this site (which may differ from the
  // global master when an exception is set); the bottom-nav shield stays global.
  const onRealSite = !!activeTab && activeTab.url !== 'about:blank';
  const activeDomain = onRealSite ? normalizeDomain(activeTab!.url) : null;
  const siteMode: SiteExceptionMode | undefined = activeDomain ? siteExceptions[activeDomain] : undefined;
  const shieldActive = siteMode === 'off' ? false : siteMode === 'strict' ? true : globalShield;

  // Clear any stale error when switching tabs (the WebView remounts by key).
  React.useEffect(() => {
    setLoadError(null);
  }, [activeTab?.id]);

  // Android hardware back (while browsing): close the blocked-trackers sheet
  // first, then walk the page's own history. Returning false lets the OS handle
  // it (exit the app) when there's nothing left to go back to.
  const canGoBack = activeTab?.canGoBack ?? false;
  React.useEffect(() => {
    const onBack = () => {
      if (showBlocked) {
        setShowBlocked(false);
        return true;
      }
      if (showSiteSheet) {
        setShowSiteSheet(false);
        return true;
      }
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [showBlocked, showSiteSheet, canGoBack]);

  const trackersBlocked = activeTab?.trackersBlocked ?? 0;
  const blockedList = Object.entries(activeTab?.blockedDomains ?? {}).sort(
    (a, b) => b[1] - a[1],
  );

  const normalizeUrl = (input: string): string => {
    if (input.startsWith('http://') || input.startsWith('https://')) {return input;}
    if (input.includes('.') && !input.includes(' ')) {return `https://${input}`;}
    return `https://duckduckgo.com/?q=${encodeURIComponent(input)}`;
  };

  const handleNavigate = () => {
    if (!activeTab || !addressInput.trim()) {return;}
    const url = normalizeUrl(addressInput.trim());
    updateTab(activeTab.id, { url });
    setIsEditingAddress(false);
    setAddressInput('');
  };

  const displayDomain = (url: string) => {
    if (!url || url === 'about:blank') {return t('newTabTitle');}
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const toggleShield = () => {
    toggleSetting('hardeningEnabled');
    webViewRef.current?.reload();
  };

  // "Home" state = new/blank tab. The browser toolbar's home button returns here.
  const isHome = !onRealSite;
  const goHome = () => {
    if (activeTab && !isHome) {
      updateTab(activeTab.id, { url: 'about:blank', title: '', canGoBack: false, canGoForward: false });
    }
  };

  // Snapshot the current page into the tab's preview (shown in the Tabs grid),
  // then open the switcher. On Android a hardware-layer WebView captures blank,
  // so flip to a software layer, let it re-render, capture, and restore.
  const captureAndOpenTabs = async () => {
    if (onRealSite && activeTab && webShotRef.current) {
      try {
        setCapturing(true);
        await new Promise((r) => setTimeout(r, 80));
        const uri = await captureRef(webShotRef, { format: 'jpg', quality: 0.5, result: 'data-uri' });
        updateTab(activeTab.id, { preview: uri });
      } catch {
        // capture unsupported on this device — the Tabs grid keeps the icon fallback
      } finally {
        setCapturing(false);
      }
    }
    onOpenTabs();
  };

  // Apply a per-site override (or clear it with null) and reload so the new
  // injected bundle takes effect immediately.
  const applySiteException = (mode: SiteExceptionMode | null) => {
    if (!activeDomain) {return;}
    setSiteException(activeDomain, mode);
    setShowSiteSheet(false);
    webViewRef.current?.reload();
  };

  return (
    <View style={styles.root}>
      {isHome ? (
        /* Home header (faithful to main-screen.png): hamburger + shield only */
        <View style={styles.homeHeader}>
          <TouchableOpacity style={styles.homeHeaderBtn} onPress={onOpenDrawer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MenuIcon size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeHeaderBtn} onPress={toggleShield} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ShieldCheckIcon size={22} color={globalShield ? colors.primary : colors.muted} bg={colors.bg} />
          </TouchableOpacity>
        </View>
      ) : isEditingAddress ? (
        /* Editing the address (browsing): a top input pill with autofocus */
        <View style={styles.editPill}>
          <LockIcon size={14} color={colors.secondary} bg={colors.surfaceCard} />
          <TextInput
            style={styles.editInput}
            value={addressInput}
            onChangeText={setAddressInput}
            onSubmitEditing={handleNavigate}
            onBlur={() => setIsEditingAddress(false)}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            placeholder={t('addressPlaceholder')}
            placeholderTextColor={colors.muted}
          />
        </View>
      ) : (
        /* Security top pill (faithful to the browsing mockup): shield + status +
           PRIVACY LIVE on the left; network + more on the right. */
        <View style={styles.topPill}>
          <TouchableOpacity
            style={styles.topPillLeft}
            onPress={() => setShowSiteSheet(true)}
            activeOpacity={0.7}>
            <View style={styles.shieldChip}>
              <ShieldCheckIcon size={15} color="#2b0088" bg="#947dff" />
            </View>
            <View style={styles.topPillText}>
              <Text style={styles.statusLabel} numberOfLines={1}>
                {shieldActive ? t('statusEncrypted') : t('statusUnprotected')}
                {siteMode ? ' •' : ''}
              </Text>
              <View style={styles.pulseRow}>
                <View style={[styles.pulseDot, shieldActive && styles.pulseDotOn]} />
                <Text style={[styles.pulseText, shieldActive && styles.pulseTextOn]} numberOfLines={1}>
                  {trackersBlocked > 0 ? `${trackersBlocked} ${t('blocked')}` : t('privacyLive')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.topPillRight}>
            <TouchableOpacity style={styles.pillIconBtn} onPress={onOpenDrawer} activeOpacity={0.7}>
              <LockIcon size={17} color={colors.onSurfaceVariant} bg={colors.surfaceCard} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.pillIconBtn} onPress={() => setShowBlocked(true)} activeOpacity={0.7}>
              <MoreIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* WebView principal */}
      <View ref={webShotRef} collapsable={false} style={styles.webviewContainer}>
        {activeTab && activeTab.url !== 'about:blank' ? (
          <BrowserEngine
            key={activeTab.id}
            ref={webViewRef}
            url={activeTab.url}
            androidLayerType={capturing ? 'software' : 'hardware'}
            onNavigationStateChange={(state: WebViewNavigation) => {
              updateTab(activeTab.id, {
                url: state.url,
                title: state.title ?? '',
                canGoBack: state.canGoBack,
                canGoForward: state.canGoForward,
              });
            }}
            onBlocked={(domain) => {
              recordBlocked(activeTab.id, domain);
            }}
            onLoadStart={() => setLoadError(null)}
            onLoadError={setLoadError}
          />
        ) : (
          <HomeContent
            onOpenNetwork={onOpenNetwork}
            onNavigate={(input) => {
              const url = normalizeUrl(input);
              if (activeTab) {
                updateTab(activeTab.id, { url });
              } else {
                addTab(url);
              }
            }}
          />
        )}

        {/* Load-error overlay: DNS/timeout/offline or HTTP >= 400 on the main frame */}
        {loadError && activeTab && activeTab.url !== 'about:blank' && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorIconWrap}>
              <WarnIcon size={56} color={colors.warning} bg={colors.surfaceCard} />
            </View>
            <Text style={styles.errorTitle}>{t('errorTitle')}</Text>
            <Text style={styles.errorSubtitle}>{t('errorSubtitle')}</Text>
            <Text style={styles.errorDetail} numberOfLines={1}>
              {displayDomain(activeTab.url)}
              {loadError.code ? ` · ${loadError.code}` : ''}
            </Text>
            <TouchableOpacity
              style={styles.errorBtn}
              activeOpacity={0.8}
              onPress={() => {
                setLoadError(null);
                webViewRef.current?.reload();
              }}>
              <Text style={styles.errorBtnText}>{t('errorRetry')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isHome ? (
        /* Home toolbar: ‹ › ⌂ [n]  (the app menu lives in the ☰ drawer, top-left) */
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => webViewRef.current?.goBack()}
            disabled={!canGoBack}>
            <BackIcon size={24} color={colors.onSurfaceVariant} disabled={!canGoBack} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => webViewRef.current?.goForward()}
            disabled={!activeTab?.canGoForward}>
            <ForwardIcon size={24} color={colors.onSurfaceVariant} disabled={!activeTab?.canGoForward} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={goHome}>
            <HomeIcon size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={captureAndOpenTabs}>
            <TabsIcon size={22} color={colors.muted} count={tabs.length} />
          </TouchableOpacity>
        </View>
      ) : (
        /* Browsing bottom pill (browsing mockup): ‹ › [URL] [n] + */
        <View style={styles.bottomPill}>
          <TouchableOpacity
            style={styles.pillNavBtn}
            onPress={() => webViewRef.current?.goBack()}
            disabled={!canGoBack}>
            <BackIcon size={22} color={colors.onSurfaceVariant} disabled={!canGoBack} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pillNavBtn}
            onPress={() => webViewRef.current?.goForward()}
            disabled={!activeTab?.canGoForward}>
            <ForwardIcon size={22} color={colors.onSurfaceVariant} disabled={!activeTab?.canGoForward} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pillUrl}
            onPress={() => {
              setAddressInput(activeTab?.url && activeTab.url !== 'about:blank' ? activeTab.url : '');
              setIsEditingAddress(true);
            }}
            activeOpacity={0.7}>
            <LockIcon size={13} color={colors.secondary} bg={colors.surfaceCard} />
            <Text style={styles.pillUrlText} numberOfLines={1}>
              {displayDomain(activeTab?.url ?? '')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillNavBtn} onPress={captureAndOpenTabs}>
            <TabsIcon size={20} color={colors.onSurfaceVariant} count={tabs.length} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillAdd} onPress={() => addTab('about:blank')} activeOpacity={0.85}>
            <Text style={styles.pillAddText}>＋</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Blocked-trackers detail: what junk was stopped on this page */}
      <Modal
        visible={showBlocked}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBlocked(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => setShowBlocked(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: 32 + insets.bottom }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <ShieldCheckIcon size={16} color={colors.primary} bg={colors.surfaceCard} />
              <Text style={styles.modalTitle}>{trackersBlocked} {t('blockedModalTitle')}</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {displayDomain(activeTab?.url ?? '')}
            </Text>

            {blockedList.length === 0 ? (
              <Text style={styles.modalEmpty}>
                {t('blockedModalEmpty')}
              </Text>
            ) : (
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {blockedList.map(([domain, count]) => (
                  <View key={domain} style={styles.modalRow}>
                    <Text style={styles.modalDomain} numberOfLines={1}>{domain}</Text>
                    <View style={styles.modalCountPill}>
                      <Text style={styles.modalCount}>{count}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Per-site privacy sheet (Task 9): override hardening for this domain */}
      <Modal
        visible={showSiteSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSiteSheet(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => setShowSiteSheet(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: 32 + insets.bottom }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <ShieldCheckIcon size={16} color={colors.primary} bg={colors.surfaceCard} />
              <Text style={styles.modalTitle}>{t('siteSheetTitle')}</Text>
            </View>
            <Text style={styles.modalSubtitle}>{activeDomain}</Text>

            {([
              {mode: null, sel: siteMode === undefined, title: t('siteOptDefault'), sub: t('siteOptDefaultSub')},
              {mode: 'off' as const, sel: siteMode === 'off', title: t('siteOptOff'), sub: t('siteOptOffSub')},
              {mode: 'strict' as const, sel: siteMode === 'strict', title: t('siteOptStrict'), sub: t('siteOptStrictSub')},
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.title}
                style={styles.siteOpt}
                activeOpacity={0.7}
                onPress={() => applySiteException(opt.mode)}>
                <View style={styles.siteOptText}>
                  <Text style={styles.siteOptTitle}>{opt.title}</Text>
                  <Text style={styles.siteOptSub}>{opt.sub}</Text>
                </View>
                <View style={[styles.radio, opt.sel && styles.radioOn]}>
                  {opt.sel && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: Palette, surfaces: Surfaces) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Home header (main-screen.png): hamburger + shield
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 56,
  },
  homeHeaderBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Browser toolbar (main-screen.png footer): ‹ › ⌂ [n] ⋮
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 20,
    marginHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: surfaces.hairline,
  },
  toolBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Security top pill (browsing)
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 8,
    height: 52,
    borderRadius: 999,
    paddingLeft: 8,
    paddingRight: 6,
    backgroundColor: alpha(colors.surfaceCard, 0.85),
    borderWidth: 1,
    borderColor: surfaces.hairline,
  },
  topPillLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  shieldChip: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#947dff', alignItems: 'center', justifyContent: 'center' },
  topPillText: { flex: 1 },
  statusLabel: { color: colors.primary, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  pulseRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.outline },
  pulseDotOn: { backgroundColor: colors.tertiary },
  pulseText: { fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 1 },
  pulseTextOn: { color: colors.tertiary },
  topPillRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pillIconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  // Editing pill (browsing): address input
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 8,
    height: 52,
    borderRadius: 999,
    paddingHorizontal: 18,
    backgroundColor: alpha(colors.surfaceContainer, 0.95),
    borderWidth: 1,
    borderColor: alpha(colors.secondary, 0.4),
  },
  editInput: { flex: 1, color: colors.onSurface, fontSize: 15, fontWeight: '500', padding: 0 },

  // Browsing bottom pill: ‹ › [URL] [n] +
  bottomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    height: 60,
    borderRadius: 999,
    paddingHorizontal: 6,
    backgroundColor: alpha(colors.surfaceHigh, 0.92),
    borderWidth: 1,
    borderColor: surfaces.hairline,
  },
  pillNavBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pillUrl: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  pillUrlText: { color: colors.onSurface, fontSize: 13, fontWeight: '500', flexShrink: 1 },
  pillAdd: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#cabeff', alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  pillAddText: { color: '#32009a', fontSize: 24, fontWeight: '700', lineHeight: 26 },

  // WebView
  webviewContainer: {
    flex: 1,
    marginHorizontal: 10,
    marginTop: 2,
    marginBottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  // Load-error overlay (covers the WebView)
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorIconWrap: { marginBottom: 16, opacity: 0.9 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: colors.onSurface, marginBottom: 8, textAlign: 'center' },
  errorSubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 6 },
  errorDetail: { fontSize: 12, color: colors.faint, marginBottom: 24, letterSpacing: 0.3 },
  errorBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 99,
    backgroundColor: alpha(colors.primarySolid, 0.15),
    borderWidth: 1,
    borderColor: surfaces.primaryBorder,
  },
  errorBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  // Blocked-trackers modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderColor: surfaces.hairline,
  },
  modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outline, marginBottom: 16 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  modalSubtitle: { fontSize: 13, color: colors.muted, marginBottom: 16 },
  modalEmpty: { fontSize: 14, color: colors.muted, paddingVertical: 24, textAlign: 'center' },
  modalList: { marginTop: 4 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: surfaces.divider,
  },
  modalDomain: { flex: 1, fontSize: 14, color: colors.onSurface, marginRight: 12 },
  modalCountPill: { minWidth: 28, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: alpha(colors.primarySolid, 0.15), alignItems: 'center' },
  modalCount: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Per-site privacy sheet
  siteOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: surfaces.divider,
  },
  siteOptText: { flex: 1, marginRight: 12 },
  siteOptTitle: { fontSize: 15, fontWeight: '600', color: colors.onSurface, marginBottom: 2 },
  siteOptSub: { fontSize: 12, color: colors.muted, lineHeight: 16 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primarySolid },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primarySolid },
});
