// In-page tracker request blocker (JS-only, no native code).
//
// Why this exists: react-native-webview's onShouldStartLoadWithRequest only sees
// top-level navigations, NOT subresources (scripts, fetch, XHR, beacons, pixels)
// — which is where virtually all trackers live. That's why the on-navigation
// counter read "0 BLOCKED". This blocker runs INSIDE the page and wraps the
// network APIs, so it actually blocks tracker subresources and reports each block
// to the app via window.ReactNativeWebView.postMessage({__spider:'blocked'}).
//
// It's config-driven (domain list is passed in) so the package keeps no
// dependency on the app or @spider/network; the app adapter supplies the list.
export const buildRequestBlocker = (domains: string[]): string => {
  const list = JSON.stringify(domains.map(d => d.toLowerCase()));
  return `(function(){
    var BLOCKED = ${list};
    function matchDomain(u){
      if(!u) return null;
      u = ('' + u).toLowerCase();
      for(var i=0;i<BLOCKED.length;i++){ if(u.indexOf(BLOCKED[i])!==-1) return BLOCKED[i]; }
      return null;
    }
    function report(d){
      try{
        if(window.ReactNativeWebView){
          window.ReactNativeWebView.postMessage(JSON.stringify({__spider:'blocked', d:d}));
        }
      }catch(e){}
    }

    // fetch: resolve blocked calls with an empty 204 so .then() chains don't throw.
    try {
      var _fetch = window.fetch;
      if (_fetch) {
        window.fetch = function(input){
          try {
            var url = (typeof input === 'string') ? input : (input && input.url);
            var d = matchDomain(url);
            if (d) {
              report(d);
              return Promise.resolve(new Response('', {status: 204, statusText: 'blocked'}));
            }
          } catch(e){}
          return _fetch.apply(this, arguments);
        };
      }
    } catch(e){}

    // XMLHttpRequest: flag on open(), silently drop on send().
    try {
      var _open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url){
        try { this.__spiderBlocked = matchDomain(url); } catch(e){}
        return _open.apply(this, arguments);
      };
      var _send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function(){
        if (this.__spiderBlocked) { report(this.__spiderBlocked); return; }
        return _send.apply(this, arguments);
      };
    } catch(e){}

    // sendBeacon: pretend success without sending.
    try {
      if (navigator.sendBeacon) {
        var _beacon = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = function(url){
          var d = matchDomain(url);
          if (d) { report(d); return true; }
          return _beacon.apply(navigator, arguments);
        };
      }
    } catch(e){}

    // Strip tracker <script>/<img>/<iframe> nodes as they are inserted.
    try {
      var scan = function(el){
        if (!el || !el.tagName) return;
        var src = el.src || (el.getAttribute && el.getAttribute('src')) || '';
        var d = matchDomain(src);
        if (d) {
          try { if (el.parentNode) el.parentNode.removeChild(el); } catch(e){}
          report(d);
        }
      };
      var obs = new MutationObserver(function(muts){
        for (var m=0;m<muts.length;m++){
          var an = muts[m].addedNodes;
          for (var n=0;n<an.length;n++){ scan(an[n]); }
        }
      });
      obs.observe(document.documentElement || document, {childList:true, subtree:true});
    } catch(e){}
  })();`;
};
