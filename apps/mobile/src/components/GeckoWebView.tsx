import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  requireNativeComponent,
  UIManager,
  findNodeHandle,
  NativeSyntheticEvent,
  HostComponent,
  ViewStyle,
} from 'react-native';
import type { WebViewNavigation } from 'react-native-webview';
import type { HardenedWebViewHandle, HardenedWebViewProps } from './HardenedWebView';

// Native events emitted by GeckoViewManager (Android). Names match the manager's
// getExportedCustomDirectEventTypeConstants registrationNames.
interface LocationEvent { url: string }
interface LoadingEvent { loading: boolean; canGoBack: boolean; canGoForward: boolean; progress: number }
interface ErrorEvent { url?: string; code: number; category: number }
interface TitleEvent { title: string }

interface NativeGeckoProps {
  url: string;
  style?: ViewStyle;
  onLocationChange?: (e: NativeSyntheticEvent<LocationEvent>) => void;
  onLoadingChange?: (e: NativeSyntheticEvent<LoadingEvent>) => void;
  onLoadError?: (e: NativeSyntheticEvent<ErrorEvent>) => void;
  onTitleChange?: (e: NativeSyntheticEvent<TitleEvent>) => void;
}

// RNTGeckoView is a legacy SimpleViewManager rendered under Fabric via the
// automatic interop layer (New Architecture). requireNativeComponent resolves it.
const RNTGeckoView: HostComponent<NativeGeckoProps> =
  requireNativeComponent<NativeGeckoProps>('RNTGeckoView');

/**
 * GeckoView-backed engine (Android, Phase 4) with the SAME imperative handle and
 * a compatible prop subset as {@link HardenedWebView}, so it can be swapped in
 * behind the GECKOVIEW_ENABLED flag (see BrowserEngine).
 *
 * Tracking protection is enforced at the engine level (STRICT ETP in
 * GeckoRuntimeProvider), so there is no in-page request blocker here. JS bundle
 * injection and the per-tab tracker counter (onMessage/onBlocked) are wired in a
 * follow-up increment via a bundled WebExtension; those props are accepted now
 * but not yet emitted.
 */
export const GeckoWebView = forwardRef<HardenedWebViewHandle, HardenedWebViewProps>(
  ({ url, onNavigationStateChange, onLoadError, onLoadStart, style }, ref) => {
    const nativeRef = useRef<React.ComponentRef<typeof RNTGeckoView>>(null);
    // Coalesced navigation snapshot rebuilt from the native events, shaped like
    // react-native-webview's WebViewNavigation for the shared consumer.
    const nav = useRef<Partial<WebViewNavigation>>({ url, canGoBack: false, canGoForward: false });

    const dispatch = useCallback((command: string) => {
      const node = findNodeHandle(nativeRef.current);
      if (node != null) {
        UIManager.dispatchViewManagerCommand(node, command, []);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      goBack: () => dispatch('goBack'),
      goForward: () => dispatch('goForward'),
      reload: () => dispatch('reload'),
    }));

    const pushNav = () => onNavigationStateChange?.(nav.current as WebViewNavigation);

    return (
      <RNTGeckoView
        ref={nativeRef}
        url={url}
        style={style as ViewStyle}
        onLocationChange={(e) => {
          nav.current.url = e.nativeEvent.url;
          pushNav();
        }}
        onLoadingChange={(e) => {
          const { loading, canGoBack, canGoForward } = e.nativeEvent;
          nav.current.canGoBack = canGoBack;
          nav.current.canGoForward = canGoForward;
          nav.current.loading = loading;
          if (loading) { onLoadStart?.(); }
          pushNav();
        }}
        onTitleChange={(e) => {
          nav.current.title = e.nativeEvent.title;
          pushNav();
        }}
        onLoadError={(e) => {
          onLoadError?.({
            kind: 'native',
            code: e.nativeEvent.code,
            url: e.nativeEvent.url,
            description: `gecko error (category ${e.nativeEvent.category})`,
          });
        }}
      />
    );
  }
);
