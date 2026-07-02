// New-tab / home screen. Faithful to the Stitch "Spider Privacy Main Screen"
// mockup (stitch-designs/main-screen.png), rendered in the project's violet
// Obsidian Stealth palette (the mockup's blue accent is an export outlier):
// spider-shield logo + wordmark, a hero search bar, a glowing concentric-ring
// lock in its enclosing circle, tagline, and an honest private-network pill
// (reflects the SELECTED transport, not a verified tunnel — Phase 5).
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { useT } from '../i18n';
import { colors } from '../theme/theme';
import { ShieldCheckIcon, GlobeIcon } from '../components/icons';

const RING = 236;
// Concentric ring sizes; each is absolutely centered inside the RING box.
const RINGS = [236, 184, 136];
const LOCK_CIRCLE = 116;

interface HomeContentProps {
  onOpenSettings: () => void;
  onNavigate: (input: string) => void;
}

export const HomeContent: React.FC<HomeContentProps> = ({ onOpenSettings, onNavigate }) => {
  const networkMode = useSettingsStore((s) => s.networkMode);
  const t = useT();
  const [query, setQuery] = useState('');

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

  return (
    <View style={styles.root}>
      {/* Brand: spider-shield logo + wordmark */}
      <Image source={require('../../logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.wordmark}>
        Spider<Text style={styles.wordmarkAccent}>Privacy</Text>
      </Text>
      <Text style={styles.wordmarkSub}>Browser</Text>

      {/* Hero search bar — a real input: type a URL or search term to navigate. */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
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

      {/* Hero: glowing concentric rings around a vector padlock in its circle */}
      <View style={styles.hero}>
        {RINGS.map((size, i) => (
          <View
            key={size}
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                top: (RING - size) / 2,
                left: (RING - size) / 2,
                borderColor: `rgba(124,92,252,${0.1 + i * 0.1})`,
              },
            ]}
          />
        ))}
        <View style={styles.lockCircle}>
          <View style={styles.lock}>
            <View style={styles.lockShackle} />
            <View style={styles.lockBody}>
              <View style={styles.keyholeDot} />
              <View style={styles.keyholeStem} />
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.tagline}>{t('homeTagline')}</Text>

      {/* Honest network status: shows the selected transport, taps to Settings */}
      <TouchableOpacity
        style={[styles.netPill, isPrivate ? styles.netPillPrivate : styles.netPillDirect]}
        onPress={onOpenSettings}
        activeOpacity={0.75}>
        {isPrivate ? (
          <ShieldCheckIcon size={16} color={colors.tertiary} bg="#0f1a12" />
        ) : (
          <GlobeIcon size={16} color={colors.muted} />
        )}
        <Text style={[styles.netText, isPrivate && styles.netTextPrivate]}>{netLabel}</Text>
      </TouchableOpacity>
      <Text style={styles.netHint}>{t('netTapHint')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
  },

  logo: { width: 164, height: 132, marginBottom: 6 },
  wordmark: { fontSize: 30, fontWeight: '800', color: '#f4f2f7', letterSpacing: -0.5 },
  wordmarkAccent: { color: colors.primaryBright },
  wordmarkSub: { fontSize: 17, fontWeight: '500', color: colors.muted, marginTop: 2 },

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
    backgroundColor: 'rgba(31,31,34,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 14, padding: 0 },

  // Hero rings + lock circle
  hero: { width: RING, height: RING, marginBottom: 28, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1 },
  lockCircle: {
    width: LOCK_CIRCLE,
    height: LOCK_CIRCLE,
    borderRadius: LOCK_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19,19,22,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.3)',
    shadowColor: '#7c5cfc',
    shadowRadius: 24,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
  },
  lock: { alignItems: 'center' },
  lockShackle: {
    width: 38,
    height: 30,
    borderWidth: 6,
    borderColor: '#a78bfa',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    borderBottomWidth: 0,
    marginBottom: -6,
  },
  lockBody: {
    width: 60,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primarySolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyholeDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#1a1626' },
  keyholeStem: { width: 5, height: 9, backgroundColor: '#1a1626', marginTop: -1, borderRadius: 2 },

  tagline: { fontSize: 14, color: colors.muted, fontWeight: '500', marginBottom: 16, textAlign: 'center' },

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
  netPillPrivate: { borderColor: 'rgba(0,228,120,0.35)', backgroundColor: 'rgba(0,228,120,0.1)' },
  netPillDirect: { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' },
  netText: { fontSize: 14, fontWeight: '700', color: colors.muted, letterSpacing: 0.3 },
  netTextPrivate: { color: colors.tertiary },
  netHint: { fontSize: 11, color: colors.faint, marginTop: 8 },
});
