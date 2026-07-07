package com.spiderprivacybrowser.orbot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Bridge to the Guardian Project Orbot app (Tor for Android).
 *
 * We never build our own VpnService or bundle Tor — Orbot already owns a
 * system VpnService that captures all device traffic through the Tor network.
 * This module detects Orbot, launches it, opens its screen, and — new in
 * Phase 5a — listens for Orbot's status broadcasts so the app can reflect the
 * REAL tunnel state ("STARTING" → "ON" → "OFF") in the network chip instead of
 * just echoing the selected mode. Because Orbot's VPN is device-wide, once it is
 * ON our WebView/GeckoView traffic is tunnelled automatically.
 */
class OrbotModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  // Registered lazily (startStatus) and torn down on invalidate(). Orbot sends
  // these broadcasts from its own process, so the receiver must be EXPORTED.
  private var statusReceiver: BroadcastReceiver? = null

  // Primary, Orbot-version-independent signal: watch for an active VPN transport.
  // Current Orbot (17.x) no longer broadcasts its legacy STATUS intent to
  // third-party apps, so the broadcast above often never fires "ON". The VPN
  // network callback fires reliably when Orbot's device-wide tunnel comes up or
  // drops, which — while Orbot is the selected transport — IS the tunnel state.
  private var vpnCallback: ConnectivityManager.NetworkCallback? = null

  /** True if the Orbot app is installed on the device. */
  @ReactMethod
  fun isInstalled(promise: Promise) {
    promise.resolve(resolveInstalled())
  }

  /**
   * Ask Orbot to start Tor. If Orbot is not installed, resolves with
   * `{ started: false, installed: false }` so JS can offer to install it.
   * Sending the START action makes Orbot request VPN consent (first run) and
   * bring up the tunnel; we do not need any VPN permission ourselves. We also
   * pass our package name so Orbot targets us with STATUS broadcasts back.
   */
  @ReactMethod
  fun start(promise: Promise) {
    if (!resolveInstalled()) {
      val res = com.facebook.react.bridge.Arguments.createMap()
      res.putBoolean("started", false)
      res.putBoolean("installed", false)
      promise.resolve(res)
      return
    }
    try {
      val intent = Intent(ACTION_START).apply {
        setPackage(ORBOT_PACKAGE)
        // Ask Orbot to send its status back to us (STARTING/ON/OFF broadcasts).
        putExtra(EXTRA_PACKAGE_NAME, reactApplicationContext.packageName)
        // Orbot's start receiver is not exported to background senders on newer
        // Android, so also try to bring the app to the foreground below.
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactApplicationContext.sendBroadcast(intent)
      openApp()
      val res = com.facebook.react.bridge.Arguments.createMap()
      res.putBoolean("started", true)
      res.putBoolean("installed", true)
      promise.resolve(res)
    } catch (e: Exception) {
      promise.reject("ORBOT_START_FAILED", e)
    }
  }

  /**
   * Begin listening for Orbot status broadcasts. Idempotent — safe to call from
   * JS on every mount. Also nudges Orbot to report its current status so the UI
   * has a value even if the tunnel state hasn't changed since launch.
   */
  @ReactMethod
  fun startStatus(promise: Promise) {
    registerStatusReceiver()
    registerVpnCallback()
    emitCurrentVpnState()
    if (resolveInstalled()) {
      // A status request that does NOT start Tor: Orbot replies with its current
      // STATUS without bringing up the VPN (older Orbot only; harmless otherwise).
      try {
        val req = Intent(ACTION_STATUS).apply {
          setPackage(ORBOT_PACKAGE)
          putExtra(EXTRA_PACKAGE_NAME, reactApplicationContext.packageName)
        }
        reactApplicationContext.sendBroadcast(req)
      } catch (_: Exception) { /* best-effort */ }
    }
    promise.resolve(true)
  }

  /** Open the Orbot app's main screen (so the user can confirm the tunnel). */
  @ReactMethod
  fun openApp(promise: Promise) {
    if (openApp()) {
      promise.resolve(true)
    } else {
      promise.reject("ORBOT_NOT_INSTALLED", "Orbot is not installed")
    }
  }

  /** Open the store page to install Orbot. */
  @ReactMethod
  fun openInstall(promise: Promise) {
    try {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(INSTALL_URL)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ORBOT_INSTALL_FAILED", e)
    }
  }

  private fun registerStatusReceiver() {
    if (statusReceiver != null) return
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        val status = intent?.getStringExtra(EXTRA_STATUS) ?: return
        emitStatus(status)
      }
    }
    val filter = IntentFilter(ACTION_STATUS)
    // Orbot broadcasts from its own process → the receiver must be exported.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactApplicationContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      reactApplicationContext.registerReceiver(receiver, filter)
    }
    statusReceiver = receiver
  }

  private fun connectivityManager(): ConnectivityManager? =
      reactApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE)
          as? ConnectivityManager

  private fun registerVpnCallback() {
    if (vpnCallback != null) return
    val cm = connectivityManager() ?: return
    val request = NetworkRequest.Builder()
        .addTransportType(NetworkCapabilities.TRANSPORT_VPN)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN)
        .build()
    val cb = object : ConnectivityManager.NetworkCallback() {
      override fun onAvailable(network: Network) = emitStatus("ON")
      override fun onLost(network: Network) = emitStatus("OFF")
    }
    try {
      cm.registerNetworkCallback(request, cb)
      vpnCallback = cb
    } catch (_: Exception) { /* registration limit / transient */ }
  }

  /** Emit the current VPN state once, so the UI is correct on first mount. */
  private fun emitCurrentVpnState() {
    val cm = connectivityManager() ?: return
    val active = cm.allNetworks.any { net ->
      cm.getNetworkCapabilities(net)?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true
    }
    emitStatus(if (active) "ON" else "OFF")
  }

  private fun emitStatus(status: String) {
    if (!reactApplicationContext.hasActiveReactInstance()) return
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_STATUS, status)
  }

  override fun invalidate() {
    statusReceiver?.let {
      try {
        reactApplicationContext.unregisterReceiver(it)
      } catch (_: Exception) { /* already gone */ }
    }
    statusReceiver = null
    vpnCallback?.let {
      try {
        connectivityManager()?.unregisterNetworkCallback(it)
      } catch (_: Exception) { /* already gone */ }
    }
    vpnCallback = null
    super.invalidate()
  }

  private fun openApp(): Boolean {
    val launch = reactApplicationContext.packageManager
        .getLaunchIntentForPackage(ORBOT_PACKAGE) ?: return false
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(launch)
    return true
  }

  private fun resolveInstalled(): Boolean =
      try {
        reactApplicationContext.packageManager.getPackageInfo(ORBOT_PACKAGE, 0)
        true
      } catch (e: PackageManager.NameNotFoundException) {
        false
      }

  companion object {
    const val NAME = "Orbot"
    const val EVENT_STATUS = "orbotStatus"
    private const val ORBOT_PACKAGE = "org.torproject.android"
    private const val ACTION_START = "org.torproject.android.intent.action.START"
    private const val ACTION_STATUS = "org.torproject.android.intent.action.STATUS"
    private const val EXTRA_STATUS = "org.torproject.android.intent.extra.STATUS"
    private const val EXTRA_PACKAGE_NAME =
        "org.torproject.android.intent.extra.PACKAGE_NAME"
    private const val INSTALL_URL =
        "https://play.google.com/store/apps/details?id=org.torproject.android"
  }
}
