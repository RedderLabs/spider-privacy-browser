// New-tab / home screen. Faithful to the Stitch "Spider Privacy Main Screen"
// mockup (stitch-designs/main-screen.png), rendered in the project's violet
// Obsidian Stealth palette (the mockup's blue accent is an export outlier):
// spider-shield logo + wordmark, a hero search bar, a glowing concentric-ring
// lock in its enclosing circle, tagline, and an honest private-network pill
// (reflects the SELECTED transport, not a verified tunnel — Phase 5).
//
// Responsive: the whole column is a centered flex layout that ADAPTS to the
// available space (never scrolls). It measures its own height (onLayout) and
// scales the hero to fit, hiding it when vertical room is tight, so the primary
// controls always fit on any device size/resolution. Capped to contentMaxWidth
// so it doesn't stretch on tablets; hero/logo/type scale with the device.
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { useT } from '../i18n';
import { alpha, type Palette, type Surfaces } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { ShieldCheckIcon, GlobeIcon } from '../components/icons';

// Base (guideline) hero geometry; scaled per-device at render time.
const RING = 236;
const RINGS = [236, 184, 136];
const LOCK_CIRCLE = 116;

interface HomeContentProps {
  onOpenNetwork: () => void;
  onNavigate: (input: string) => void;
}

export const HomeContent: React.FC<HomeContentProps> = ({ onOpenNetwork, onNavigate }) => {
  const networkMode = useSettingsStore((s) => s.networkMode);
  const t = useT();
  const r = useResponsive();
  const { colors, surfaces } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, surfaces), [colors, surfaces]);
  const [query, setQuery] = useState('');
  // Actual height this content is given (screen minus header/toolbar/safe areas),
  // measured so the hero can be sized to fit instead of overflowing into a scroll.
  const [avail, setAvail] = useState(0);

  const submit = () => {
    const q = query.trim();
    if (q) {
      onNavigate(q);
      setQuery('');
    }
  };

  const isPrivate = networkMode !== 'none';
  // Brand names stay untranslated; 'none' uses a localized label.
  const netLabel =
    networkMode === 'orbot'
      ? 'Orbot (Tor)'
      : networkMode === 'mullvad'
      ? 'Mullvad WireGuard'
      : t('netDirect');

  // Scale the hero proportionally, then derive every ring/lock dimension from a
  // single ratio so the padlock keeps its exact proportions at any size.
  // The hero is the biggest, most flexible element, so it absorbs the fit: it is
  // capped to a share of the AVAILABLE height (measured), and hidden entirely
  // when there isn't enough room (short landscape or small screens) so the fixed
  // controls — logo, search bar, tagline, network pill — always fit without scroll.
  const availH = avail || r.height;
  const landscape = r.width > r.height && !r.isTablet;
  const compact = landscape || availH < 560;
  const heroSize = Math.round(Math.min(r.moderateScale(RING, 0.4), availH * 0.34));
  const k = heroSize / RING;
  const px = (n: number) => Math.round(n * k);
  const logoW = compact ? r.font(62) : r.moderateScale(164, 0.4);
  const logoH = compact ? r.font(50) : r.moderateScale(132, 0.4);

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      onLayout={(e) => setAvail(e.nativeEvent.layout.height)}>
      <View style={[styles.inner, { maxWidth: r.contentMaxWidth }]}>
        {/* Brand: spider-shield logo + wordmark */}
        <Image source={require('../../logo.png')} style={{ width: logoW, height: logoH, marginBottom: 6 }} resizeMode="contain" />
        <Text style={[styles.wordmark, { fontSize: compact ? r.font(22) : r.font(30) }]}>
          Spider<Text style={styles.wordmarkAccent}>Privacy</Text>
        </Text>
        <Text style={[styles.wordmarkSub, { fontSize: compact ? r.font(13) : r.font(17) }]}>Browser</Text>

        {/* Hero search bar — a real input: type a URL or search term to navigate. */}
        <View style={[styles.searchBar, compact && styles.searchBarCompact]}>
          <TextInput
            style={[styles.searchInput, { fontSize: r.font(14) }]}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            placeholder={t('addressPlaceholder')}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
          />
          <ShieldCheckIcon size={18} color={colors.primary} bg={colors.bg} />
        </View>

        {/* Hero: glowing concentric rings around a vector padlock in its circle.
            Hidden in phone-landscape (compact) so the search bar stays above the fold. */}
        {!compact && (
        <View style={[styles.hero, { width: heroSize, height: heroSize }]}>
          {RINGS.map((size, i) => {
            const s = px(size);
            return (
              <View
                key={size}
                style={[
                  styles.ring,
                  {
                    width: s,
                    height: s,
                    borderRadius: s / 2,
                    top: (heroSize - s) / 2,
                    left: (heroSize - s) / 2,
                    borderColor: alpha(colors.primarySolid, 0.1 + i * 0.1),
                  },
                ]}
              />
            );
          })}
          <View
            style={[
              styles.lockCircle,
              { width: px(LOCK_CIRCLE), height: px(LOCK_CIRCLE), borderRadius: px(LOCK_CIRCLE) / 2 },
            ]}>
            <View style={styles.lock}>
              <View
                style={[
                  styles.lockShackle,
                  {
                    width: px(38),
                    height: px(30),
                    borderWidth: Math.max(4, px(6)),
                    borderTopLeftRadius: px(19),
                    borderTopRightRadius: px(19),
                    marginBottom: -px(6),
                  },
                ]}
              />
              <View style={[styles.lockBody, { width: px(60), height: px(48), borderRadius: px(12) }]}>
                <View style={[styles.keyholeDot, { width: px(11), height: px(11), borderRadius: px(11) / 2 }]} />
                <View style={[styles.keyholeStem, { width: px(5), height: px(9), borderRadius: px(2) }]} />
              </View>
            </View>
          </View>
        </View>
        )}

        <Text style={[styles.tagline, { fontSize: r.font(14) }, compact && styles.taglineCompact]}>{t('homeTagline')}</Text>

        {/* Honest network status: shows the selected transport, taps to Settings */}
        <TouchableOpacity
          style={[styles.netPill, isPrivate ? styles.netPillPrivate : styles.netPillDirect]}
          onPress={onOpenNetwork}
          activeOpacity={0.75}>
          {isPrivate ? (
            <ShieldCheckIcon size={16} color={colors.tertiary} bg="#0f1a12" />
          ) : (
            <GlobeIcon size={16} color={colors.muted} />
          )}
          <Text style={[styles.netText, { fontSize: r.font(14) }, isPrivate && styles.netTextPrivate]}>{netLabel}</Text>
        </TouchableOpacity>
        {!compact && <Text style={[styles.netHint, { fontSize: r.font(11) }]}>{t('netTapHint')}</Text>}
      </View>
    </View>
  );
};

const makeStyles = (colors: Palette, surfaces: Surfaces) => StyleSheet.create({
  // Flex container that fills the space it's given and centres the column. No
  // ScrollView: the hero scales to `avail` so everything fits; overflow is
  // clipped as a last resort rather than introducing a scroll.
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    overflow: 'hidden',
  },
  containerCompact: { paddingVertical: 12 },
  inner: { width: '100%', alignItems: 'center' },

  // Phone-landscape (compact) overrides: tighter hero so the search bar fits.
  searchBarCompact: { marginTop: 8, marginBottom: 10, paddingVertical: 11 },
  taglineCompact: { marginBottom: 8 },

  wordmark: { fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  wordmarkAccent: { color: colors.primaryBright },
  wordmarkSub: { fontWeight: '500', color: colors.muted, marginTop: 2 },

  // Hero search bar
  searchBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 24,
    marginBottom: 28,
    borderRadius: 999,
    backgroundColor: alpha(colors.surfaceContainer, 0.85),
    borderWidth: 1,
    borderColor: surfaces.hairline,
  },
  searchInput: { flex: 1, color: colors.onSurface, padding: 0 },

  // Hero rings + lock circle
  hero: { marginBottom: 28, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1 },
  lockCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(colors.surface, 0.5),
    borderWidth: 1,
    borderColor: alpha(colors.primarySolid, 0.3),
    shadowColor: colors.primarySolid,
    shadowRadius: 24,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
  },
  lock: { alignItems: 'center' },
  lockShackle: {
    borderColor: '#a78bfa',
    borderBottomWidth: 0,
  },
  lockBody: {
    backgroundColor: colors.primarySolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyholeDot: { backgroundColor: '#1a1626' },
  keyholeStem: { backgroundColor: '#1a1626', marginTop: -1 },

  tagline: { color: colors.muted, fontWeight: '500', marginBottom: 16, textAlign: 'center' },

  // Network pill
  netPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  netPillPrivate: { borderColor: alpha(colors.tertiary, 0.35), backgroundColor: surfaces.emeraldTint },
  netPillDirect: { borderColor: surfaces.hairline, backgroundColor: surfaces.divider },
  netText: { fontWeight: '700', color: colors.muted, letterSpacing: 0.3 },
  netTextPrivate: { color: colors.tertiary },
  netHint: { color: colors.faint, marginTop: 8 },
});
