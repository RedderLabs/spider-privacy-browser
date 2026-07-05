package com.spiderprivacybrowser.gecko

import android.content.Context
import org.mozilla.geckoview.ContentBlocking
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoRuntimeSettings

/**
 * Process-wide [GeckoRuntime] holder.
 *
 * GeckoView requires a single runtime per process — creating a second one
 * throws — so it lives here as a lazy, thread-safe singleton shared by every
 * [GeckoViewManager] view/session.
 *
 * Tracking protection is configured at the ENGINE level (this is the whole point
 * of Phase 4 vs. the System WebView): STRICT Enhanced Tracking Protection, which
 * applies Mozilla's own blocklists for ads/analytics/social trackers plus
 * cryptomining and fingerprinting. STRICT ETP only engages when trackers' cookies
 * are isolated, so the cookie policy is set to ACCEPT_NON_TRACKERS.
 */
object GeckoRuntimeProvider {
  @Volatile private var runtime: GeckoRuntime? = null

  fun get(context: Context): GeckoRuntime =
      runtime ?: synchronized(this) {
        runtime ?: build(context.applicationContext).also { runtime = it }
      }

  private fun build(context: Context): GeckoRuntime {
    val contentBlocking =
        ContentBlocking.Settings.Builder()
            .enhancedTrackingProtectionLevel(ContentBlocking.EtpLevel.STRICT)
            // STRICT preset already bundles AD | ANALYTIC | SOCIAL | CONTENT |
            // CRYPTOMINING | FINGERPRINTING | STP.
            .antiTracking(ContentBlocking.AntiTracking.STRICT)
            .strictSocialTrackingProtection(true)
            // Required for STRICT ETP to actually take effect (isolates trackers).
            .cookieBehavior(ContentBlocking.CookieBehavior.ACCEPT_NON_TRACKERS)
            .build()

    val settings =
        GeckoRuntimeSettings.Builder()
            .contentBlocking(contentBlocking)
            .aboutConfigEnabled(false)
            // Debuggable (dev) builds otherwise auto-read a debug config file
            // (/data/local/tmp/<pkg>-geckoview-config.yaml) and inject env vars;
            // a null entry reaches native putenv → strdup(null) → SIGSEGV at the
            // first session. An empty path is special-cased to skip that file I/O.
            .configFilePath("")
            .build()

    return GeckoRuntime.create(context, settings)
  }
}
