// Navigator hardening: normalize device capabilities to a COHERENT mobile
// profile (Pixel 7 / Chrome Android — must match USER_AGENT in device.ts) and
// hide automation/webdriver signals.
//
// Coherence matters: the previous version reported a desktop platform (Win32,
// maxTouchPoints 0, desktop PDF plugins) under a mobile Android UA. That
// contradiction is exactly what anti-bot systems flag, causing CAPTCHAs. We now
// report Android-consistent values and no longer inject fake desktop plugins.
export const navigatorHardening = `
      Object.defineProperties(navigator, {
        hardwareConcurrency: { get: () => 8 },
        deviceMemory:        { get: () => 8 },
        languages:           { get: () => ['es-ES', 'es', 'en-US', 'en'] },
        platform:            { get: () => 'Linux armv8l' },
        vendor:              { get: () => 'Google Inc.' },
        maxTouchPoints:      { get: () => 5 },
        webdriver:           { get: () => false },
      });

      // Android Chrome exposes window.chrome; keep a minimal, coherent shim.
      if (!window.chrome) {
        window.chrome = {
          runtime: {},
          loadTimes: function() { return {}; },
          csi: function() { return {}; },
          app: { isInstalled: false },
        };
      }

      if (navigator.permissions && navigator.permissions.query) {
        const originalQuery = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (parameters) => {
          if (parameters && parameters.name === 'notifications') {
            return Promise.resolve({ state: 'denied', onchange: null });
          }
          return originalQuery(parameters);
        };
      }
    `;
