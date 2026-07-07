package com.spiderprivacybrowser.wireguard

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.wireguard.android.backend.Backend
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config
import java.io.BufferedReader
import java.io.StringReader
import java.util.concurrent.Executors

/**
 * Generic WireGuard tunnel (Phase 5b). Imports a standard WireGuard `.conf`
 * (works with Mullvad or any provider) and brings a real tunnel up/down via the
 * wireguard-android GoBackend, which owns its own VpnService. We never embed a
 * provider account — the user supplies the config.
 *
 * Session-only by the app's incognito-pure model: the imported config lives in
 * memory and is dropped when the process dies; nothing WireGuard-related is
 * persisted to disk.
 *
 * Status is emitted to JS as `wireguardState` ("up" | "down"). All backend calls
 * run on a single background thread (GoBackend must not touch the main thread).
 */
class WireGuardModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private val backend: Backend by lazy { GoBackend(reactApplicationContext.applicationContext) }
  private val io = Executors.newSingleThreadExecutor()

  private var config: Config? = null
  // Held while the OS VPN-consent dialog is up, resolved in onActivityResult.
  private var pendingConnect: Promise? = null

  private val tunnel = object : Tunnel {
    override fun getName() = TUNNEL_NAME
    override fun onStateChange(newState: Tunnel.State) {
      emitState(if (newState == Tunnel.State.UP) "up" else "down")
    }
  }

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName() = NAME

  /**
   * Parse and store a WireGuard config. Returns a small summary the UI can show
   * (first peer endpoint + interface addresses) so the user can confirm it.
   */
  @ReactMethod
  fun importConfig(text: String, promise: Promise) {
    try {
      val parsed = Config.parse(BufferedReader(StringReader(text)))
      config = parsed
      val res = Arguments.createMap()
      res.putBoolean("ok", true)
      val endpoint = parsed.peers.firstOrNull()?.endpoint?.orElse(null)?.toString() ?: ""
      val addresses = parsed.`interface`.addresses.joinToString(", ") { it.toString() }
      res.putString("endpoint", endpoint)
      res.putString("addresses", addresses)
      promise.resolve(res)
    } catch (e: Exception) {
      promise.reject("WG_PARSE_FAILED", e.message ?: "Invalid WireGuard config", e)
    }
  }

  /** True if a config has been imported this session. */
  @ReactMethod
  fun hasConfig(promise: Promise) {
    promise.resolve(config != null)
  }

  /**
   * Bring the tunnel up. Requests VPN consent first if not yet granted; the
   * actual bring-up happens after consent (or immediately if already granted).
   */
  @ReactMethod
  fun connect(promise: Promise) {
    if (config == null) {
      promise.reject("WG_NO_CONFIG", "Import a WireGuard config first")
      return
    }
    val prepare = VpnService.prepare(reactApplicationContext)
    if (prepare != null) {
      val activity = currentActivity
      if (activity == null) {
        promise.reject("WG_NO_ACTIVITY", "No foreground activity to request VPN consent")
        return
      }
      pendingConnect = promise
      activity.startActivityForResult(prepare, REQ_VPN_CONSENT)
      return
    }
    bringUp(promise)
  }

  private fun bringUp(promise: Promise) {
    val cfg = config
    if (cfg == null) {
      promise.reject("WG_NO_CONFIG", "No config")
      return
    }
    io.execute {
      try {
        backend.setState(tunnel, Tunnel.State.UP, cfg)
        emitState("up")
        promise.resolve(true)
      } catch (e: Exception) {
        emitState("down")
        promise.reject("WG_CONNECT_FAILED", e.message ?: "Could not start tunnel", e)
      }
    }
  }

  @ReactMethod
  fun disconnect(promise: Promise) {
    io.execute {
      try {
        backend.setState(tunnel, Tunnel.State.DOWN, null)
        emitState("down")
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("WG_DISCONNECT_FAILED", e.message ?: "Could not stop tunnel", e)
      }
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    io.execute {
      try {
        val up = backend.getState(tunnel) == Tunnel.State.UP
        promise.resolve(if (up) "up" else "down")
      } catch (e: Exception) {
        promise.resolve("down")
      }
    }
  }

  private fun emitState(state: String) {
    if (!reactApplicationContext.hasActiveReactInstance()) return
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_STATE, state)
  }

  override fun onActivityResult(
      activity: Activity?,
      requestCode: Int,
      resultCode: Int,
      data: Intent?
  ) {
    if (requestCode != REQ_VPN_CONSENT) return
    val promise = pendingConnect ?: return
    pendingConnect = null
    if (resultCode == Activity.RESULT_OK) {
      bringUp(promise)
    } else {
      emitState("down")
      promise.reject("WG_CONSENT_DENIED", "VPN permission was not granted")
    }
  }

  override fun onNewIntent(intent: Intent?) { /* unused */ }

  companion object {
    const val NAME = "WireGuard"
    const val EVENT_STATE = "wireguardState"
    private const val TUNNEL_NAME = "spider"
    private const val REQ_VPN_CONSENT = 40510
  }
}
