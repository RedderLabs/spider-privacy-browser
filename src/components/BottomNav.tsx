// Shared bottom navigation, always visible across Browser and Tabs screens.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useT } from '../i18n';
import { colors, surfaces, radius, spacing } from '../theme/theme';
import { SearchIcon, TabsIcon, SettingsIcon, ShieldCheckIcon } from './icons';

// Surface tone behind the nav pill, used to punch "cutout" details in the icons.
const NAV_SURFACE = '#1c1c20';

export interface BottomNavProps {
  active: 'browse' | 'tabs';
  tabCount: number;
  shieldActive: boolean;
  onBrowse: () => void;
  onTabs: () => void;
  onToggleShield: () => void;
  onSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  active,
  tabCount,
  shieldActive,
  onBrowse,
  onTabs,
  onToggleShield,
  onSettings,
}) => {
  const t = useT();
  const browseColor = active === 'browse' ? colors.primary : colors.muted;
  const tabsColor = active === 'tabs' ? colors.primary : colors.muted;
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={[styles.navItem, active === 'browse' && styles.navItemActive]}
        onPress={onBrowse}>
        <SearchIcon size={20} color={browseColor} />
        <Text style={[styles.navLabel, active === 'browse' && styles.navLabelActive]}>
          {t('navBrowse')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, active === 'tabs' && styles.navItemActive]}
        onPress={onTabs}>
        <TabsIcon size={20} color={tabsColor} count={tabCount} />
        <Text style={[styles.navLabel, active === 'tabs' && styles.navLabelActive]}>
          {t('navTabs')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={onToggleShield}>
        <ShieldCheckIcon
          size={20}
          color={shieldActive ? colors.primary : colors.muted}
          bg={NAV_SURFACE}
        />
        <Text style={[styles.navLabel, shieldActive && styles.navLabelActive]}>
          {shieldActive ? t('navShield') : t('navShieldOff')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={onSettings}>
        <SettingsIcon size={20} color={colors.muted} bg={NAV_SURFACE} />
        <Text style={styles.navLabel}>{t('navSettings')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: spacing.margin,
    marginBottom: spacing.lg,
    backgroundColor: surfaces.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: surfaces.hairline,
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
  },
  navItem: { alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, gap: 3 },
  navItemActive: { backgroundColor: surfaces.divider, borderRadius: radius.pill },
  navLabel: { fontSize: 11, color: colors.muted, fontWeight: '500' },
  navLabelActive: { color: colors.primary, fontWeight: '700' },
});
