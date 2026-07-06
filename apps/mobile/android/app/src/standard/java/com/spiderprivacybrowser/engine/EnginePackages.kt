package com.spiderprivacybrowser.engine

import com.facebook.react.ReactPackage

/**
 * Engine-specific React packages for the `standard` edition (system WebView).
 *
 * There is no GeckoView in this flavor, so nothing extra is registered. The
 * matching `gecko` source set (src/gecko/java/.../engine/EnginePackages.kt)
 * returns the GeckoView package instead. MainApplication (in src/main) calls
 * this without knowing which flavor it compiled against.
 */
object EnginePackages {
  fun extraPackages(): List<ReactPackage> = emptyList()
}
