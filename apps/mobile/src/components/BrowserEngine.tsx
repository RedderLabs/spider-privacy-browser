import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import {
  HardenedWebView,
  HardenedWebViewHandle,
  HardenedWebViewProps,
} from './HardenedWebView';
import { GeckoWebView } from './GeckoWebView';
import { FEATURES } from '../config/env';

// GeckoView is Android-only and experimental (Phase 4). It is chosen only when
// the build flag is on AND we're on Android; everything else keeps the hardened
// react-native-webview engine. Both expose the same HardenedWebViewHandle/props,
// so the consumer (BrowserScreen) is engine-agnostic.
const useGecko = FEATURES.geckoView && Platform.OS === 'android';

/**
 * Engine-agnostic browser view: renders either the GeckoView engine or the
 * hardened WebView, selected once at module load by the GECKOVIEW_ENABLED flag.
 */
export const BrowserEngine = forwardRef<HardenedWebViewHandle, HardenedWebViewProps>(
  (props, ref) =>
    useGecko ? <GeckoWebView ref={ref} {...props} /> : <HardenedWebView ref={ref} {...props} />
);
