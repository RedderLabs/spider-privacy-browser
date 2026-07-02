// src/screens/TabsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useTabStore} from '../store/tabStore';
import {useSettingsStore} from '../store/settingsStore';
import {BottomNav} from '../components/BottomNav';
import {useT} from '../i18n';
import {colors} from '../theme/theme';
import {GlobeIcon, LockIcon, SearchIcon, BookIcon} from '../components/icons';

interface TabsScreenProps {
  onTabSelect: (id: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
}

const getDomain = (url: string, blankLabel: string): string => {
  if (!url || url === 'about:blank') {return blankLabel;}
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

// Per-tab favicon substitute: a line icon chosen from the URL. (No real favicons
// yet — thumbnails/favicons are Phase-2 work per ROADMAP.)
const TabIcon: React.FC<{url: string; size: number; color: string}> = ({url, size, color}) => {
  if (!url || url === 'about:blank') {return <LockIcon size={size} color={color} bg="#0D0D0F" />;}
  if (url.includes('duckduckgo')) {return <SearchIcon size={size} color={color} />;}
  if (url.includes('medium')) {return <BookIcon size={size} color={color} />;}
  return <GlobeIcon size={size} color={color} />;
};

export const TabsScreen: React.FC<TabsScreenProps> = ({
  onTabSelect,
  onClose,
  onOpenSettings,
}) => {
  const {tabs, activeTabId, addTab, closeTab, setActiveTab, clearAll} =
    useTabStore();
  const shieldActive = useSettingsStore(s => s.hardeningEnabled);
  const toggleSetting = useSettingsStore(s => s.toggle);
  const t = useT();
  const blankLabel = t('newTabTitle');

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    onTabSelect(id);
  };

  const handleNewTab = () => {
    addTab('about:blank');
    onClose();
  };

  const handleCloseTab = (id: string) => {
    closeTab(id);
    if (tabs.length <= 1) {onClose();}
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{tabs.length} {t('tabsOpen')}</Text>
        </View>
        <TouchableOpacity
          style={styles.newTabBtn}
          onPress={handleNewTab}
          activeOpacity={0.8}>
          <Text style={styles.newTabIcon}>＋</Text>
          <Text style={styles.newTabText}>{t('newTab')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Grid */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}>
        {tabs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <LockIcon size={48} color={colors.muted} bg="#0D0D0F" />
            </View>
            <Text style={styles.emptyTitle}>{t('noOpenTabs')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('noOpenTabsHint')}
            </Text>
          </View>
        ) : (
          <View style={styles.gridInner}>
            {tabs.map(tab => {
              const isActive = tab.id === activeTabId;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabCard, isActive && styles.tabCardActive]}
                  onPress={() => handleSelectTab(tab.id)}
                  activeOpacity={0.85}>
                  {/* Card Header */}
                  <View
                    style={[
                      styles.cardHeader,
                      isActive && styles.cardHeaderActive,
                    ]}>
                    <View style={styles.cardHeaderLeft}>
                      <TabIcon url={tab.url} size={14} color={isActive ? colors.primary : colors.onSurfaceVariant} />
                      <Text
                        style={[
                          styles.cardDomain,
                          isActive && styles.cardDomainActive,
                        ]}
                        numberOfLines={1}>
                        {getDomain(tab.url, blankLabel)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.closeBtn,
                        isActive && styles.closeBtnActive,
                      ]}
                      onPress={() => handleCloseTab(tab.id)}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <Text style={styles.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tab Preview: real page snapshot if captured, else icon */}
                  <View style={styles.cardPreview}>
                    {tab.preview ? (
                      <Image
                        source={{uri: tab.preview}}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.previewContent}>
                        <View style={styles.previewIcon}>
                          <TabIcon url={tab.url} size={32} color={colors.muted} />
                        </View>
                        <Text style={styles.previewDomain} numberOfLines={2}>
                          {getDomain(tab.url, blankLabel)}
                        </Text>
                        {tab.title ? (
                          <Text style={styles.previewTitle} numberOfLines={3}>
                            {tab.title}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.closeAllBtn}
          onPress={() => {
            clearAll();
            onClose();
          }}
          activeOpacity={0.8}>
          <Text style={styles.closeAllText}>{t('closeAll')}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Nav (compartido) */}
      <BottomNav
        active="tabs"
        tabCount={tabs.length}
        shieldActive={shieldActive}
        onBrowse={onClose}
        onTabs={() => {}}
        onToggleShield={() => toggleSetting('hardeningEnabled')}
        onSettings={onOpenSettings}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0D0D0F'},

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(13,13,15,0.8)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e4e1e6',
    letterSpacing: -0.3,
  },
  newTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#947dff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
  },
  newTabIcon: {color: '#1c0062', fontSize: 16, fontWeight: '700'},
  newTabText: {
    color: '#1c0062',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Scroll + Grid
  scroll: {flex: 1},
  grid: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 160},
  gridInner: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},

  // Tab Card
  tabCard: {
    width: '47.5%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(26,26,31,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabCardActive: {
    borderColor: 'rgba(202,190,255,0.5)',
    backgroundColor: '#1f1f22',
    shadowColor: '#cabeff',
    shadowRadius: 12,
    shadowOpacity: 0.12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardHeaderActive: {backgroundColor: 'rgba(202,190,255,0.1)'},
  cardHeaderLeft: {flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1},
  cardDomain: {
    fontSize: 12,
    fontWeight: '500',
    color: '#c9c4d8',
    flex: 1,
  },
  cardDomainActive: {color: '#cabeff', fontWeight: '700'},
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnActive: {backgroundColor: 'rgba(202,190,255,0.2)'},
  closeBtnText: {color: '#938ea1', fontSize: 10, fontWeight: '700'},

  // Preview
  cardPreview: {
    aspectRatio: 4 / 5,
    backgroundColor: '#2a2a2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {width: '100%', height: '100%'},
  previewContent: {alignItems: 'center', paddingHorizontal: 12},
  previewIcon: {fontSize: 32, marginBottom: 10, opacity: 0.6},
  previewDomain: {
    fontSize: 12,
    fontWeight: '600',
    color: '#938ea1',
    textAlign: 'center',
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 11,
    color: '#484555',
    textAlign: 'center',
    lineHeight: 15,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {fontSize: 48, marginBottom: 16, opacity: 0.3},
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e4e1e6',
    marginBottom: 6,
  },
  emptySubtitle: {fontSize: 14, color: '#938ea1'},

  // Bottom actions
  bottomActions: {alignItems: 'center', paddingBottom: 12},
  closeAllBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.2)',
    backgroundColor: 'rgba(255,180,171,0.08)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 99,
  },
  closeAllText: {
    color: '#ffb4ab',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(31,31,34,0.6)',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  navItem: {alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4},
  navItemActive: {backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 99},
  navIcon: {fontSize: 20, marginBottom: 2},
  navLabel: {fontSize: 11, color: '#938ea1', fontWeight: '500'},
  navLabelActive: {color: '#cabeff', fontWeight: '700'},
});
