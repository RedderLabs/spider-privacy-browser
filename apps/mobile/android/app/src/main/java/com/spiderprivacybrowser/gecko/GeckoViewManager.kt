package com.spiderprivacybrowser.gecko

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoView
import org.mozilla.geckoview.WebRequestError

/**
 * Legacy [SimpleViewManager] that renders a [GeckoView]. Under the New
 * Architecture (Fabric) RN's automatic interop layer wraps this and renders it —
 * no codegen spec is needed for a leaf native view (see Phase 4 notes).
 *
 * Each view owns one [GeckoSession] opened against the shared
 * [GeckoRuntimeProvider] runtime. Navigation/progress/content delegates are
 * bridged to JS as direct events (onLocationChange / onLoadingChange /
 * onLoadError / onTitleChange). Imperative goBack/goForward/reload arrive through
 * [receiveCommand].
 */
class GeckoViewManager : SimpleViewManager<GeckoView>() {

  override fun getName() = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): GeckoView {
    val view = GeckoView(reactContext)
    val session = GeckoSession()

    // Per-session, mutable load state so onCanGoBack/onCanGoForward/onPageStart
    // can be coalesced into a single onLoadingChange payload.
    val state = LoadState()

    session.navigationDelegate =
        object : GeckoSession.NavigationDelegate {
          override fun onLocationChange(
              s: GeckoSession,
              url: String?,
              perms: MutableList<GeckoSession.PermissionDelegate.ContentPermission>,
              hasUserGesture: Boolean,
          ) {
            state.url = url ?: ""
            emit(reactContext, view.id, EVENT_LOCATION, Arguments.createMap().apply {
              putString("url", state.url)
            })
          }

          override fun onCanGoBack(s: GeckoSession, canGoBack: Boolean) {
            state.canGoBack = canGoBack
            emitLoading(reactContext, view.id, state)
          }

          override fun onCanGoForward(s: GeckoSession, canGoForward: Boolean) {
            state.canGoForward = canGoForward
            emitLoading(reactContext, view.id, state)
          }

          override fun onLoadError(
              s: GeckoSession,
              uri: String?,
              error: WebRequestError,
          ): GeckoResult<String>? {
            emit(reactContext, view.id, EVENT_ERROR, Arguments.createMap().apply {
              putString("url", uri)
              putInt("code", error.code)
              putInt("category", error.category)
            })
            return null
          }
        }

    session.progressDelegate =
        object : GeckoSession.ProgressDelegate {
          override fun onPageStart(s: GeckoSession, url: String) {
            state.loading = true
            state.progress = 0
            emitLoading(reactContext, view.id, state)
          }

          override fun onPageStop(s: GeckoSession, success: Boolean) {
            state.loading = false
            state.progress = 100
            emitLoading(reactContext, view.id, state)
          }

          override fun onProgressChange(s: GeckoSession, progress: Int) {
            state.progress = progress
            emitLoading(reactContext, view.id, state)
          }
        }

    session.contentDelegate =
        object : GeckoSession.ContentDelegate {
          override fun onTitleChange(s: GeckoSession, title: String?) {
            emit(reactContext, view.id, EVENT_TITLE, Arguments.createMap().apply {
              putString("title", title ?: "")
            })
          }
        }

    session.open(GeckoRuntimeProvider.get(reactContext))
    view.setSession(session)
    return view
  }

  @ReactProp(name = "url")
  fun setUrl(view: GeckoView, url: String?) {
    if (url.isNullOrEmpty()) return
    // RN re-invokes prop setters on every render; only load when the URL actually
    // changes so we don't reload the page (and lose scroll/history) needlessly.
    if (url == lastUrl[view]) return
    lastUrl[view] = url
    view.session?.loadUri(url)
  }

  override fun receiveCommand(view: GeckoView, commandId: String, args: ReadableArray?) {
    when (commandId) {
      CMD_GO_BACK -> view.session?.goBack()
      CMD_GO_FORWARD -> view.session?.goForward()
      CMD_RELOAD -> view.session?.reload()
    }
  }

  override fun onDropViewInstance(view: GeckoView) {
    super.onDropViewInstance(view)
    lastUrl.remove(view)
    view.session?.let {
      it.close()
      view.releaseSession()
    }
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
      mutableMapOf(
          EVENT_LOCATION to mapOf("registrationName" to "onLocationChange"),
          EVENT_LOADING to mapOf("registrationName" to "onLoadingChange"),
          EVENT_ERROR to mapOf("registrationName" to "onLoadError"),
          EVENT_TITLE to mapOf("registrationName" to "onTitleChange"),
      )

  /** Coalesced loading/navigation state pushed to JS as one onLoadingChange. */
  private class LoadState {
    var url: String = ""
    var loading: Boolean = false
    var canGoBack: Boolean = false
    var canGoForward: Boolean = false
    var progress: Int = 0
  }

  /** Minimal generic direct event; works under both the old and new renderer. */
  private class GeckoEvent(
      surfaceId: Int,
      viewId: Int,
      private val name: String,
      private val data: WritableMap,
  ) : Event<GeckoEvent>(surfaceId, viewId) {
    override fun getEventName() = name
    override fun getEventData() = data
  }

  private fun emitLoading(reactContext: ThemedReactContext, viewId: Int, state: LoadState) {
    emit(reactContext, viewId, EVENT_LOADING, Arguments.createMap().apply {
      putBoolean("loading", state.loading)
      putBoolean("canGoBack", state.canGoBack)
      putBoolean("canGoForward", state.canGoForward)
      putInt("progress", state.progress)
    })
  }

  private fun emit(reactContext: ThemedReactContext, viewId: Int, name: String, data: WritableMap) {
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, viewId) ?: return
    val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
    dispatcher.dispatchEvent(GeckoEvent(surfaceId, viewId, name, data))
  }

  companion object {
    private const val REACT_CLASS = "RNTGeckoView"

    private const val CMD_GO_BACK = "goBack"
    private const val CMD_GO_FORWARD = "goForward"
    private const val CMD_RELOAD = "reload"

    private const val EVENT_LOCATION = "topLocationChange"
    private const val EVENT_LOADING = "topLoadingChange"
    private const val EVENT_ERROR = "topLoadError"
    private const val EVENT_TITLE = "topTitleChange"

    // Maps each managed view to its last-loaded URL to de-dupe prop-driven loads.
    private val lastUrl = java.util.WeakHashMap<GeckoView, String>()
  }
}
