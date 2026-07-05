package com.spiderprivacybrowser.dns

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * RN bridge for the in-app DoH VpnService. Handles the one-time VPN consent
 * dialog (VpnService.prepare) and start/stop/status.
 */
class DnsVpnModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var pendingDohUrl: String? = null
  private var pendingPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName() = NAME

  @ReactMethod
  fun isRunning(promise: Promise) {
    promise.resolve(DnsVpnService.isRunning)
  }

  /**
   * Start the DoH VPN for [dohUrl]. If the user hasn't granted VPN consent yet,
   * shows the system consent dialog; the service starts on approval. Resolves
   * true when started/approved, false if the user declined.
   */
  @ReactMethod
  fun start(dohUrl: String, promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No current activity to request VPN consent")
      return
    }
    val consent = VpnService.prepare(reactApplicationContext)
    if (consent != null) {
      pendingDohUrl = dohUrl
      pendingPromise = promise
      activity.startActivityForResult(consent, VPN_REQUEST)
    } else {
      startService(dohUrl)
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    val i = Intent(reactApplicationContext, DnsVpnService::class.java).apply {
      action = DnsVpnService.ACTION_STOP
    }
    reactApplicationContext.startService(i)
    promise.resolve(true)
  }

  private fun startService(dohUrl: String) {
    val i = Intent(reactApplicationContext, DnsVpnService::class.java).apply {
      putExtra(DnsVpnService.EXTRA_DOH_URL, dohUrl)
    }
    reactApplicationContext.startService(i)
  }

  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != VPN_REQUEST) return
    val p = pendingPromise
    val url = pendingDohUrl
    pendingPromise = null
    pendingDohUrl = null
    if (resultCode == Activity.RESULT_OK && url != null) {
      startService(url)
      p?.resolve(true)
    } else {
      p?.resolve(false)
    }
  }

  override fun onNewIntent(intent: Intent?) {}

  companion object {
    const val NAME = "DnsVpn"
    private const val VPN_REQUEST = 0x7a1c
  }
}
