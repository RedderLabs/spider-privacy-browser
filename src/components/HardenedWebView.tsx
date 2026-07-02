import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import WebView, {
  WebViewProps,
  WebViewNavigation,
  WebViewMessageEvent,
} from 'react-native-webview';
// The error-event types aren't re-exported from the package root (only from the
// lib types module), so import them from there directly.
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from 'react-native-webview/lib/WebViewTypes';
import { isBlockedUrl } from '@spider/network';
import { USER_AGENT } from '@spider/privacy-js';
import { buildPrivacyBundle } from '../privacy/bundle';
import { useSettingsStore, normalizeDomain } from '../store/settingsStore';
import { FEATURES } from '../config/env';

// Normalized main-frame load failure (native error or HTTP >= 400), surfaced so
// the screen can render a themed, localized retry UI.
export interface LoadErrorInfo {
  code?: number;
  description?: string;
  url?: string;
  kind: 'native' | 'http';
}

export interface HardenedWebViewProps {
  url: string;
  onNavigationStateChange?: (state: WebViewNavigation) => void;
  onMessage?: () => void;
  onBlocked?: (domain?: string) => void;
  // Fired when the main frame fails to load (DNS/timeout/offline or HTTP >= 400).
  onLoadError?: (info: LoadErrorInfo) => void;
  // Fired when a fresh main-frame load begins (use to clear a prior error).
  onLoadStart?: () => void;
  style?: WebViewProps['style'];
  // Android render layer. Callers flip this to 'software' momentarily so the
  // page is capturable by view-shot (a hardware-layer WebView captures blank).
  androidLayerType?: WebViewProps['androidLayerType'];
}

export interface HardenedWebViewHandle {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
}

export const HardenedWebView = forwardRef<HardenedWebViewHandle, HardenedWebViewProps>(
  ({ url, onNavigationStateChange, onMessage, onBlocked, onLoadError, onLoadStart, style, androidLayerType }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const globalEnabled = useSettingsStore((s) => s.hardeningEnabled);
    const clearOnClose = useSettingsStore((s) => s.clearOnClose);
    const blockCookies = useSettingsStore((s) => s.blockCookies);
    const privacyLevel = useSettingsStore((s) => s.privacyLevel);
    // Per-site exception (Task 9) for this URL's domain, resolved reactively so
    // toggling it re-renders and the next reload injects the new bundle.
    const siteMode = useSettingsStore((s) => s.siteExceptions[normalizeDomain(url)]);

    // Effective hardening for this site: a per-site exception overrides global.
    const effEnabled = siteMode === 'off' ? false : siteMode === 'strict' ? true : globalEnabled;
    const effStrict = siteMode === 'strict' || (siteMode === undefined && privacyLevel === 'strict');
    // Only Strict injects into iframes: it blocks more but trips anti-bot walls
    // (e.g. our code running inside a site's bot-check frame). Balanced/custom
    // stay main-frame-only for compatibility.
    const mainFrameOnly = !effStrict;

    useImperativeHandle(ref, () => ({
      goBack: () => webViewRef.current?.goBack(),
      goForward: () => webViewRef.current?.goForward(),
      reload: () => webViewRef.current?.reload(),
    }));

    // Recompute the injected bundle when the shield (global or per-site) flips.
    // The change only takes effect on the next load, so callers should reload.
    const injectedJS = effEnabled ? buildPrivacyBundle(url) : '';

    // The in-page request blocker posts {__spider:'blocked'} for each tracker
    // subresource it stops. Route those to onBlocked (the tracker counter);
    // forward anything else to the optional onMessage handler.
    const handleMessage = (event: WebViewMessageEvent) => {
      const data = event?.nativeEvent?.data;
      if (data) {
        try {
          const msg = JSON.parse(data);
          if (msg && msg.__spider === 'blocked') {
            onBlocked?.(typeof msg.d === 'string' ? msg.d : undefined);
            return;
          }
        } catch {
          // not our message — fall through
        }
      }
      onMessage?.();
    };

    // Native load failure: DNS resolution, timeout, offline, TLS, etc.
    const handleError = (event: WebViewErrorEvent) => {
      const e = event?.nativeEvent;
      onLoadError?.({ kind: 'native', code: e?.code, description: e?.description, url: e?.url });
    };

    // Main-frame HTTP error (4xx/5xx). Subresource errors don't fire this.
    const handleHttpError = (event: WebViewHttpErrorEvent) => {
      const e = event?.nativeEvent;
      onLoadError?.({ kind: 'http', code: e?.statusCode, description: e?.description, url: e?.url });
    };

    return (
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        incognito={clearOnClose}
        thirdPartyCookiesEnabled={!blockCookies}
        userAgent={USER_AGENT}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly={mainFrameOnly}
        mixedContentMode="never"
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        androidLayerType={androidLayerType}
        style={style}
        onNavigationStateChange={onNavigationStateChange}
        onMessage={handleMessage}
        onLoadStart={() => onLoadStart?.()}
        onError={handleError}
        onHttpError={handleHttpError}
        onShouldStartLoadWithRequest={(request: WebViewNavigation) => {
          const blocked = FEATURES.contentBlocking && effEnabled && isBlockedUrl(request.url);
          if (blocked) {onBlocked?.();}
          return !blocked;
        }}
      />
    );
  }
);
