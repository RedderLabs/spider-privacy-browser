package com.spiderprivacybrowser.privatedns

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Reads and surfaces Android's system "Private DNS" (DNS-over-TLS) state.
 *
 * Android WebView uses the system network stack, so the only way to encrypt the
 * browser's DNS device-wide is the OS Private DNS setting. An app cannot flip it
 * (that needs WRITE_SECURE_SETTINGS / a system app), but it CAN read the current
 * state and open the settings screen so the user enables it in one tap. This
 * module reports the real state; the JS layer compares it to the selected
 * provider's DoT hostname to show whether encrypted DNS is actually active.
 */
class PrivateDnsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  /**
   * Returns { mode, hostname }:
   *   mode: "off" | "opportunistic" | "hostname" | "unknown"
   *   hostname: the configured DoT hostname when mode == "hostname", else ""
   */
  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      val resolver = reactApplicationContext.contentResolver
      // These Settings.Global keys are stable string constants ("private_dns_*").
      val mode = Settings.Global.getString(resolver, "private_dns_mode") ?: "unknown"
      val specifier = Settings.Global.getString(resolver, "private_dns_specifier") ?: ""
      val res = Arguments.createMap()
      res.putString("mode", mode)
      res.putString("hostname", specifier)
      promise.resolve(res)
    } catch (e: Exception) {
      promise.reject("PRIVATE_DNS_STATUS_FAILED", e)
    }
  }

  /** Open the Private DNS settings screen (falls back to wireless settings). */
  @ReactMethod
  fun openSettings(promise: Promise) {
    try {
      val intent = Intent(ACTION_PRIVATE_DNS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      if (intent.resolveActivity(reactApplicationContext.packageManager) != null) {
        reactApplicationContext.startActivity(intent)
      } else {
        reactApplicationContext.startActivity(
          Intent(Settings.ACTION_WIRELESS_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          },
        )
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("PRIVATE_DNS_SETTINGS_FAILED", e)
    }
  }

  /** Copy the given text (the DoT hostname) to the clipboard for easy pasting. */
  @ReactMethod
  fun copyToClipboard(text: String, promise: Promise) {
    try {
      val cm = reactApplicationContext
          .getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      cm.setPrimaryClip(ClipData.newPlainText("dns", text))
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("CLIPBOARD_FAILED", e)
    }
  }

  companion object {
    const val NAME = "PrivateDns"
    // Hidden but resolvable settings action for the Private DNS screen.
    private const val ACTION_PRIVATE_DNS_SETTINGS = "android.settings.PRIVATE_DNS_SETTINGS"
  }
}
