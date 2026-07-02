/**
 * @format
 * Smoke tests for the in-memory tab store: add / close / clearAll and UUID ids.
 */
// tabStore -> utils/uuid uses crypto.getRandomValues (polyfilled at runtime by
// react-native-get-random-values). Under Node/jest, wire it to node's webcrypto.
import {describe, it, expect, beforeEach} from '@jest/globals';
import {webcrypto} from 'crypto';
if (!(global as any).crypto) {
  (global as any).crypto = webcrypto;
}

import {useTabStore} from '../src/store/tabStore';

const reset = () => {
  useTabStore.setState({tabs: [], activeTabId: null});
};

describe('tabStore', () => {
  beforeEach(reset);

  it('addTab creates a tab, makes it active, and defaults its fields', () => {
    useTabStore.getState().addTab('https://example.com');
    const {tabs, activeTabId} = useTabStore.getState();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].url).toBe('https://example.com');
    expect(tabs[0].trackersBlocked).toBe(0);
    expect(tabs[0].canGoBack).toBe(false);
    expect(activeTabId).toBe(tabs[0].id);
  });

  it('addTab defaults to about:blank when no url is given', () => {
    useTabStore.getState().addTab();
    expect(useTabStore.getState().tabs[0].url).toBe('about:blank');
  });

  it('generates a v4-shaped UUID for each tab, unique across tabs', () => {
    const store = useTabStore.getState();
    store.addTab('https://a.com');
    store.addTab('https://b.com');
    const ids = useTabStore.getState().tabs.map(t => t.id);
    const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    ids.forEach(id => expect(id).toMatch(v4));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('closeTab removes the tab and re-points activeTabId to the last remaining', () => {
    const store = useTabStore.getState();
    store.addTab('https://a.com');
    store.addTab('https://b.com');
    const [first, second] = useTabStore.getState().tabs;
    useTabStore.getState().closeTab(second.id);
    const after = useTabStore.getState();
    expect(after.tabs).toHaveLength(1);
    expect(after.activeTabId).toBe(first.id);
  });

  it('closeTab on the last tab leaves activeTabId null', () => {
    const store = useTabStore.getState();
    store.addTab('https://a.com');
    const only = useTabStore.getState().tabs[0];
    useTabStore.getState().closeTab(only.id);
    expect(useTabStore.getState().tabs).toHaveLength(0);
    expect(useTabStore.getState().activeTabId).toBeNull();
  });

  it('recordBlocked only bumps the targeted tab and tracks domains', () => {
    const store = useTabStore.getState();
    store.addTab('https://a.com');
    store.addTab('https://b.com');
    const [a, b] = useTabStore.getState().tabs;
    useTabStore.getState().recordBlocked(a.id, 'doubleclick.net');
    useTabStore.getState().recordBlocked(a.id, 'doubleclick.net');
    useTabStore.getState().recordBlocked(a.id, 'google-analytics.com');
    const tabs = useTabStore.getState().tabs;
    const tabA = tabs.find(t => t.id === a.id)!;
    expect(tabA.trackersBlocked).toBe(3);
    expect(tabA.blockedDomains['doubleclick.net']).toBe(2);
    expect(tabA.blockedDomains['google-analytics.com']).toBe(1);
    expect(tabs.find(t => t.id === b.id)!.trackersBlocked).toBe(0);
  });

  it('recordBlocked without a domain buckets under "otros"', () => {
    useTabStore.getState().addTab('https://a.com');
    const id = useTabStore.getState().tabs[0].id;
    useTabStore.getState().recordBlocked(id);
    expect(useTabStore.getState().tabs[0].blockedDomains.otros).toBe(1);
  });

  it('clearAll wipes tabs and active id (close-all leaves zero tabs)', () => {
    const store = useTabStore.getState();
    store.addTab('https://a.com');
    store.addTab('https://b.com');
    useTabStore.getState().clearAll();
    expect(useTabStore.getState().tabs).toEqual([]);
    expect(useTabStore.getState().activeTabId).toBeNull();
  });
});
