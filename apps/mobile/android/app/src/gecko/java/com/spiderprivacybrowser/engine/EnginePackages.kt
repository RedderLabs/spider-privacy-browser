package com.spiderprivacybrowser.engine

import com.facebook.react.ReactPackage
import com.spiderprivacybrowser.gecko.GeckoViewPackage

/**
 * Engine-specific React packages for the `gecko` edition (GeckoView).
 *
 * Registers [GeckoViewPackage], which exposes the RNTGeckoView native view the
 * JS `GeckoWebView` binds to. The matching `standard` source set returns an empty
 * list. MainApplication (in src/main) calls this without a compile-time dependency
 * on GeckoView, so the standard flavor never references gecko classes.
 */
object EnginePackages {
  fun extraPackages(): List<ReactPackage> = listOf(GeckoViewPackage())
}
