package com.spiderprivacybrowser.gecko

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/** Registers [GeckoViewManager] (the RNTGeckoView native view). Added in MainApplication. */
class GeckoViewPackage : ReactPackage {
  override fun createNativeModules(
      reactContext: ReactApplicationContext
  ): List<NativeModule> = emptyList()

  override fun createViewManagers(
      reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = listOf(GeckoViewManager())
}
