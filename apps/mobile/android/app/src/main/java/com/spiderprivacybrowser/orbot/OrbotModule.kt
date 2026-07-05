package com.spiderprivacybrowser.orbot

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Bridge to the Guardian Project Orbot app (Tor for Android).
 *
 * We never build our own VpnService or bundle Tor — Orbot already owns a
 * system VpnService that captures all device traffic through the Tor network.
 * This module just detects Orbot, launches it, and lets the user open its
 * screen. Because Orbot's VPN is device-wide, once it is ON our WebView traffic
 * is tunnelled automatically; there is nothing to configure inside the WebView.
 */
class OrbotModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  /** True if the Orbot app is installed on the device. */
  @ReactMethod
  fun isInstalled(promise: Promise) {
    promise.resolve(resolveInstalled())
  }

  /**
   * Ask Orbot to start Tor. If Orbot is not installed, resolves with
   * `{ started: false, installed: false }` so JS can offer to install it.
   * Sending the START action makes Orbot request VPN consent (first run) and
   * bring up the tunnel; we do not need any VPN permission ourselves.
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
    private const val ORBOT_PACKAGE = "org.torproject.android"
    private const val ACTION_START = "org.torproject.android.intent.action.START"
    private const val INSTALL_URL =
        "https://play.google.com/store/apps/details?id=org.torproject.android"
  }
}
