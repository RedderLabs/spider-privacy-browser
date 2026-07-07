// GENERATED from @spider/privacy-js by scripts/gen-gecko-privacy-ext.js.
// Do NOT edit by hand — run `npm run gen:gecko-ext` to regenerate.
(function() {

      var __canvasSeed = (Math.floor(Math.random() * 0x7fffffff)) >>> 0;
      var __noiseAt = function(i) {
        // Cheap deterministic hash of (seed, index) -> {-1, 0, 1}.
        var x = (__canvasSeed ^ ((i + 1) * 2654435761)) >>> 0;
        x = ((x >>> 15) ^ x) >>> 0;
        return (x % 3) - 1;
      };
      var __perturb = function(ctx, w, h) {
        try {
          var imageData = ctx.getImageData(0, 0, w, h);
          var d = imageData.data;
          for (var i = 0; i < d.length; i += 4) {
            d[i]     += __noiseAt(i);
            d[i + 1] += __noiseAt(i + 1);
            d[i + 2] += __noiseAt(i + 2);
          }
          ctx.putImageData(imageData, 0, 0);
        } catch (e) {}
      };

      var originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        var ctx = this.getContext('2d');
        if (ctx) __perturb(ctx, this.width, this.height);
        return originalToDataURL.apply(this, arguments);
      };

      if (HTMLCanvasElement.prototype.toBlob) {
        var originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function() {
          var ctx = this.getContext('2d');
          if (ctx) __perturb(ctx, this.width, this.height);
          return originalToBlob.apply(this, arguments);
        };
      }
    

      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) return 'Intel Inc.';
        if (param === 37446) return 'Intel Iris OpenGL Engine';
        return getParameter.call(this, param);
      };
    

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
    

      if (document.fonts) {
        Object.defineProperty(document, 'fonts', {
          get: () => ({
            check: () => false,
            load: () => Promise.resolve([]),
            ready: Promise.resolve(),
            status: 'loaded',
            size: 0,
          })
        });
      }
    
Date.prototype.getTimezoneOffset = () => 0;

      const nativeToString = Function.prototype.toString;
      Function.prototype.toString = function() {
        if (this === Function.prototype.toString) return nativeToString.call(this);
        if (this === WebGLRenderingContext.prototype.getParameter) {
          return 'function getParameter() { [native code] }';
        }
        if (this === HTMLCanvasElement.prototype.toDataURL) {
          return 'function toDataURL() { [native code] }';
        }
        return nativeToString.call(this);
      };
    

      // --- Stage 1: safe, explicit "reject all" controls (stable selectors) ---
      var SAFE_REJECT_SELECTORS = [
        '#onetrust-reject-all-handler',
        '#didomi-notice-disagree-button',
        'button.didomi-continue-without-agreeing',
        '#CybotCookiebotDialogBodyButtonDecline',
        '[data-testid="uc-deny-all-button"]',
        '.sp_choice_type_REJECT_ALL',
        'button[aria-label="Reject all"]',
        'button[aria-label="Rechazar todo"]',
        'button[aria-label="Deny all"]',
        '[data-role="reject-all"]',
        '#gdpr-consent-tool-wrapper button[data-reject-all]',
      ];

      // Explicit reject phrases. Matched only as a FULL, short button label, and
      // rejected if the label hints at paying/subscribing/registering/saving.
      var REJECT_TEXTS = [
        'reject all', 'decline all', 'deny all', 'refuse all',
        'rechazar todo', 'rechazar todas', 'no acepto', 'solo las necesarias',
        'only necessary', 'necessary only', 'continue without accepting',
        'continuar sin aceptar',
      ];
      var UNSAFE_HINTS = [
        'suscrib', 'suscríb', 'pago', 'paga', 'pagar', '€', 'euro',
        'regístr', 'registr', 'subscribe', 'guardar', 'configur',
        'settings', 'preferenc', 'manage', 'acept', 'accept', 'agree', 'consent',
      ];

      var clickIfSafe = function(el) {
        if (!el || el.offsetParent === null) return false;
        try { el.click(); return true; } catch (e) { return false; }
      };

      var tryRejectBySelector = function() {
        for (var i = 0; i < SAFE_REJECT_SELECTORS.length; i++) {
          try {
            var el = document.querySelector(SAFE_REJECT_SELECTORS[i]);
            if (clickIfSafe(el)) return true;
          } catch (e) {}
        }
        return false;
      };

      var tryRejectByText = function() {
        var nodes = document.querySelectorAll('button, a[role="button"], [role="button"]');
        for (var i = 0; i < nodes.length; i++) {
          var btn = nodes[i];
          var text = (btn.textContent || '').trim().toLowerCase();
          if (!text || text.length > 40) continue; // long text = policy blurb, not a button
          var unsafe = false;
          for (var u = 0; u < UNSAFE_HINTS.length; u++) {
            if (text.indexOf(UNSAFE_HINTS[u]) !== -1) { unsafe = true; break; }
          }
          if (unsafe) continue;
          for (var r = 0; r < REJECT_TEXTS.length; r++) {
            if (text.indexOf(REJECT_TEXTS[r]) !== -1) {
              if (clickIfSafe(btn)) return true;
            }
          }
        }
        return false;
      };

      // --- Stage 2: cosmetic hide + restore scroll (no clicks) ---
      var HIDE_SELECTORS = [
        '#onetrust-consent-sdk', '#onetrust-banner-sdk',
        '#didomi-host', '.didomi-popup-open',
        '#CybotCookiebotDialog', '#CybotCookiebotDialogBodyUnderlay',
        '#usercentrics-root', '#usercentrics-cmp-ui',
        '.qc-cmp2-container', '.qc-cmp-cleanslate',
        '.message-container', '.sp_veil', '.sp-message-open',
        '#sp_message_container_', '[id^="sp_message_container_"]',
        '.truste_overlay', '.truste_box_overlay',
        '.cc-window', '.cookie-banner', '.cookie-consent',
        '.cmpbox', '.cmpwrapper',
        '[class*="cookie-overlay"]', '[class*="consent-overlay"]',
      ];

      var restoreScroll = function() {
        try {
          var els = [document.documentElement, document.body];
          for (var i = 0; i < els.length; i++) {
            var e = els[i];
            if (!e) continue;
            e.style.setProperty('overflow', 'auto', 'important');
            e.style.setProperty('position', 'static', 'important');
            if (e.classList) {
              e.classList.remove('didomi-popup-open', 'sp-message-open',
                'qc-cmp-cleanslate', 'modal-open', 'no-scroll', 'noscroll',
                'overflow-hidden', 'cookie-open');
            }
          }
        } catch (e) {}
      };

      var tryHideBanner = function() {
        var hidAny = false;
        for (var i = 0; i < HIDE_SELECTORS.length; i++) {
          try {
            var nodes = document.querySelectorAll(HIDE_SELECTORS[i]);
            for (var j = 0; j < nodes.length; j++) {
              nodes[j].style.setProperty('display', 'none', 'important');
              hidAny = true;
            }
          } catch (e) {}
        }
        if (hidAny) restoreScroll();
        return hidAny;
      };

      // --- Orchestration: reject if possible, else hide. Retry a few times for
      // banners injected late; then give up (never loop forever). ---
      var attempts = 0;
      var MAX_ATTEMPTS = 8;
      var run = function() {
        attempts++;
        if (tryRejectBySelector() || tryRejectByText()) return; // done
        tryHideBanner(); // best-effort each pass
        if (attempts < MAX_ATTEMPTS) setTimeout(run, 700);
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(run, 400); });
      } else {
        setTimeout(run, 400);
      }

      // Catch CMPs injected after load; auto-disconnect after 12s.
      try {
        var observer = new MutationObserver(function() {
          if (tryRejectBySelector() || tryRejectByText()) { observer.disconnect(); return; }
        });
        observer.observe(document.body || document.documentElement, {
          childList: true, subtree: true,
        });
        setTimeout(function() { observer.disconnect(); }, 12000);
      } catch (e) {}
    
})();
