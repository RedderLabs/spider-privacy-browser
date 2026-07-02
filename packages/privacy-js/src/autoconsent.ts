// Cookie-banner handler. Two-stage, safety-first strategy:
//
//  1. Click ONLY unambiguous "reject all / decline all" controls of known CMPs,
//     matched by stable id/attribute. We NEVER click:
//       - "subscribe / pay / me suscribo / €" buttons (consent-or-pay walls,
//         e.g. marca.com, send you to a paywall — see cookies_jpg/ captures),
//       - "settings / configuración / guardar preferencias" (these open panels
//         or save with everything opted-IN by default).
//  2. If no safe reject control exists, cosmetically HIDE the banner/overlay and
//     restore scrolling. This is the "make it disappear" behaviour users expect;
//     it does not accept anything (and 3rd-party cookies are blocked at the
//     WebView layer regardless).
//
// Self-contained: injected into page context, no imports, no RN globals.
export const autoconsentScript = `
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
    `;
