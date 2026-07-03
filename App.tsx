import React from 'react';
import {BackHandler, Linking, StatusBar, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {useTabStore} from './src/store/tabStore';
import {BrowserScreen} from './src/screens/BrowserScreen';
import {TabsScreen} from './src/screens/TabsScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {AboutScreen} from './src/screens/AboutScreen';
import {Drawer} from './src/components/Drawer';

function App(): React.JSX.Element {
  const {tabs, activeTabId, addTab} = useTabStore();
  const [showTabs, setShowTabs] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showAbout, setShowAbout] = React.useState(false);
  const [showDrawer, setShowDrawer] = React.useState(false);

  // No auto-created tab: the app can hold zero tabs (e.g. after "close all").
  // The home screen shows, and typing in its search bar creates a tab on demand.
  // Tabs the user keeps are restored from persistence on the next launch.

  // Android hardware back: close the Settings/Tabs overlays instead of exiting.
  // When neither is open, BrowserScreen is mounted and owns back (modal / web
  // history), so we return false there to let its handler run.
  React.useEffect(() => {
    const onBack = () => {
      if (showDrawer) {
        setShowDrawer(false);
        return true;
      }
      if (showAbout) {
        setShowAbout(false);
        return true;
      }
      if (showSettings) {
        setShowSettings(false);
        return true;
      }
      if (showTabs) {
        setShowTabs(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [showSettings, showTabs, showDrawer, showAbout]);

  // Registered as a system browser (see AndroidManifest): open any http/https URL
  // handed to us — from another app (VIEW intent) or the in-app About links — in a
  // new hardened tab, and dismiss any overlay so BrowserScreen shows it.
  const openUrlInTab = React.useCallback(
    (url: string | null) => {
      if (url && /^https?:\/\//i.test(url)) {
        addTab(url);
        setShowAbout(false);
        setShowSettings(false);
        setShowTabs(false);
        setShowDrawer(false);
      }
    },
    [addTab],
  );

  React.useEffect(() => {
    Linking.getInitialURL()
      .then(openUrlInTab)
      .catch(() => {});
    const sub = Linking.addEventListener('url', ({url}) => openUrlInTab(url));
    return () => sub.remove();
  }, [openUrlInTab]);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0D0D0F"
        translucent={false}
      />
      {/* edges include 'bottom' so the UI clears the system navigation bar on
          any device — 3-button bar, gesture pill, or none (inset = 0). */}
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {showAbout ? (
          <AboutScreen onClose={() => setShowAbout(false)} onOpenUrl={openUrlInTab} />
        ) : showSettings ? (
          <SettingsScreen onClose={() => setShowSettings(false)} />
        ) : showTabs ? (
          <TabsScreen
            onTabSelect={() => setShowTabs(false)}
            onClose={() => setShowTabs(false)}
            onOpenSettings={() => {
              setShowTabs(false);
              setShowSettings(true);
            }}
          />
        ) : (
          <BrowserScreen
            activeTab={activeTab}
            onOpenTabs={() => setShowTabs(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenDrawer={() => setShowDrawer(true)}
          />
        )}

        <Drawer
          visible={showDrawer}
          onClose={() => setShowDrawer(false)}
          onNewTab={() => {
            addTab('about:blank');
            setShowDrawer(false);
            setShowTabs(false);
            setShowSettings(false);
          }}
          onOpenTabs={() => {
            setShowDrawer(false);
            setShowTabs(true);
          }}
          onOpenSettings={() => {
            setShowDrawer(false);
            setShowSettings(true);
          }}
          onOpenAbout={() => {
            setShowDrawer(false);
            setShowTabs(false);
            setShowSettings(false);
            setShowAbout(true);
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0F',
  },
});

export default App;
