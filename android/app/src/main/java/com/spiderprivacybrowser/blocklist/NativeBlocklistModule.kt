package com.spiderprivacybrowser.blocklist

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.reactnativecommunity.webview.RNCWebViewClient

/**
 * JS bridge that feeds [NativeBlocklist]. The app calls [setDomains] with the
 * `@spider/network` tracker list at startup and [setEnabled] to follow the
 * hardening toggle. Keeping the list in JS avoids duplicating it in Kotlin.
 */
class NativeBlocklistModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  init {
    NativeBlocklist.attach(reactContext)
    // Register our blocker with the patched WebView client. The dependency runs
    // app -> react-native-webview (the valid direction); the library never
    // references app classes, it only exposes this hook.
    RNCWebViewClient.sSubresourceBlocker =
        RNCWebViewClient.SubresourceBlocker { url -> NativeBlocklist.shouldBlock(url) }
  }

  override fun getName() = NAME

  @ReactMethod
  fun setDomains(domains: ReadableArray) {
    val list = ArrayList<String>(domains.size())
    for (i in 0 until domains.size()) {
      domains.getString(i)?.let { list.add(it) }
    }
    NativeBlocklist.setDomains(list)
  }

  @ReactMethod
  fun setEnabled(enabled: Boolean) {
    NativeBlocklist.enabled = enabled
  }

  // Required so the RCTDeviceEventEmitter has a registered module on the JS side.
  @ReactMethod fun addListener(eventName: String) {}

  @ReactMethod fun removeListeners(count: Int) {}

  companion object {
    const val NAME = "NativeBlocklist"
  }
}
