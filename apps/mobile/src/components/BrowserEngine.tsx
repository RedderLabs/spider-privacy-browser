import React, { forwardRef } from 'react';
import { Platform, UIManager } from 'react-native';
import {
  HardenedWebView,
  HardenedWebViewHandle,
  HardenedWebViewProps,
} from './HardenedWebView';
import { GeckoWebView } from './GeckoWebView';
import { FEATURES } from '../config/env';

// Two editions are built from this one codebase (Android product flavors, see
// docs/GECKOVIEW.md): `standard` ships the system WebView only, `gecko` also
// compiles in GeckoView. The engine is therefore chosen by what the build
// actually contains — we detect the native RNTGeckoView view manager at runtime
// rather than trusting a flag, so the same JS bundle is correct in both editions.
// FEATURES.geckoView remains as a dev kill-switch (set GECKOVIEW_ENABLED=false to
// force the WebView even in a gecko build). Both engines expose the same
// HardenedWebViewHandle/props, so the consumer (BrowserScreen) is engine-agnostic.
const geckoCompiledIn =
  Platform.OS === 'android' && !!UIManager.hasViewManagerConfig?.('RNTGeckoView');
const useGecko = geckoCompiledIn && FEATURES.geckoView;

/**
 * Engine-agnostic browser view: renders either the GeckoView engine (gecko
 * edition) or the hardened WebView (standard edition), selected once at module
 * load from the compiled-in native engine.
 */
export const BrowserEngine = forwardRef<HardenedWebViewHandle, HardenedWebViewProps>(
  (props, ref) =>
    useGecko ? <GeckoWebView ref={ref} {...props} /> : <HardenedWebView ref={ref} {...props} />
);
