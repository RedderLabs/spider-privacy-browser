package com.spiderprivacybrowser.blocklist

import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Collections

/**
 * Native tracker blocklist, shared between two callers:
 *  - [NativeBlocklistModule] (JS side) pushes the domain list from
 *    `@spider/network` at startup and toggles [enabled] — so JS stays the single
 *    source of truth and we never hardcode the list in Kotlin.
 *  - The patched `RNCWebViewClient.shouldInterceptRequest` queries [shouldBlock]
 *    for EVERY subresource the WebView requests, blocking trackers before they
 *    hit the network (the in-page JS blocker only covers fetch/XHR/sendBeacon).
 *
 * A blocked request emits `spiderNativeBlocked` to JS so the per-tab counter can
 * account for it, mirroring the in-page blocker's postMessage.
 */
object NativeBlocklist {
  @Volatile
  var enabled = false

  private val domains: MutableSet<String> = Collections.synchronizedSet(HashSet())

  @Volatile
  private var reactContext: ReactApplicationContext? = null

  fun attach(ctx: ReactApplicationContext) {
    reactContext = ctx
  }

  fun setDomains(list: Collection<String>) {
    synchronized(domains) {
      domains.clear()
      for (d in list) {
        domains.add(d.lowercase())
      }
    }
  }

  /** A host is blocked if it equals a listed domain or is a subdomain of one. */
  private fun isBlockedHost(host: String?): Boolean {
    if (host == null) return false
    val h = host.lowercase()
    synchronized(domains) {
      if (domains.contains(h)) return true
      for (d in domains) {
        if (h.endsWith(".$d")) return true
      }
    }
    return false
  }

  /**
   * Called from the patched WebView client. Returns true (and emits the event)
   * when the URL's host is a tracker and native blocking is enabled.
   */
  fun shouldBlock(url: String?): Boolean {
    if (!enabled || url == null) return false
    val host =
        try {
          Uri.parse(url).host
        } catch (e: Exception) {
          null
        }
    if (isBlockedHost(host)) {
      emitBlocked(host)
      return true
    }
    return false
  }

  private fun emitBlocked(host: String?) {
    val ctx = reactContext ?: return
    try {
      val payload = Arguments.createMap()
      payload.putString("domain", host ?: "")
      ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("spiderNativeBlocked", payload)
    } catch (e: Exception) {
      // Best-effort: never let telemetry break a page load.
    }
  }
}
