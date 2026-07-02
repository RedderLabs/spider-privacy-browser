import React from 'react';
import {BackHandler, StatusBar, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {useTabStore} from './src/store/tabStore';
import {BrowserScreen} from './src/screens/BrowserScreen';
import {TabsScreen} from './src/screens/TabsScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {Drawer} from './src/components/Drawer';

function App(): React.JSX.Element {
  const {tabs, activeTabId, addTab} = useTabStore();
  const [showTabs, setShowTabs] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
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
  }, [showSettings, showTabs, showDrawer]);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0D0D0F"
        translucent={false}
      />
      <SafeAreaView style={styles.root} edges={['top']}>
        {showSettings ? (
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
