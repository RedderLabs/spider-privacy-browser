// Tracker/ad domain blocklist. Single source of truth for the coarse request
// blocking done in HardenedWebView (onShouldStartLoadWithRequest).
//
// NOTE: this is a *base* list matched by substring, not a full filter-list
// engine. It only sees top-level navigations and (on some platforms) some
// subresources — real per-request blocking is Phase 2 (WKContentRuleList on
// iOS, shouldInterceptRequest / GeckoView on Android). Keep entries as bare
// registrable domains; `isBlocked` matches them as substrings of the host.

export const TRACKER_DOMAINS: string[] = [
  // Google advertising / analytics
  'doubleclick.net',
  'google-analytics.com',
  'googlesyndication.com',
  'googletagmanager.com',
  'googletagservices.com',
  'googleadservices.com',
  'google-analytics.l.google.com',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  // Meta / Facebook
  'facebook.net',
  'connect.facebook.net',
  'graph.facebook.com',
  'pixel.facebook.com',
  // Amazon ads
  'amazon-adsystem.com',
  'adtago.s3.amazonaws.com',
  // Major ad networks / SSPs
  'adnxs.com',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'moatads.com',
  'adcolony.com',
  'applovin.com',
  'inmobi.com',
  'smartadserver.com',
  'casalemedia.com',
  'bidswitch.net',
  'sharethrough.com',
  'teads.tv',
  // Analytics / telemetry
  'scorecardresearch.com',
  'quantserve.com',
  'hotjar.com',
  'mixpanel.com',
  'segment.com',
  'segment.io',
  'amplitude.com',
  'fullstory.com',
  'mouseflow.com',
  'crazyegg.com',
  'chartbeat.com',
  'newrelic.com',
  'nr-data.net',
  'bugsnag.com',
  'sentry.io',
  'branch.io',
  'appsflyer.com',
  'adjust.com',
  'kochava.com',
  'bytedance.com',
  'tiktokv.com',
  'analytics.tiktok.com',
  // Misc trackers
  'yandex.ru/metrika',
  'mc.yandex.ru',
  'clarity.ms',
  'demdex.net',
  'omtrdc.net',
  'everesttech.net',
  'krxd.net',
  'bluekai.com',
  'exelator.com',
  'agkn.com',
  'rlcdn.com',
  // Programmatic ad exchanges / SSPs / DMPs (common on ES/EU news sites)
  '2mdn.net',
  'adform.net',
  'adform.com',
  'adition.com',
  'adroll.com',
  'adsrvr.org',
  'adsafeprotected.com',
  'doubleverify.com',
  'id5-sync.com',
  'indexww.com',
  '3lift.com',
  'gumgum.com',
  'media.net',
  'contextweb.com',
  'yieldlab.net',
  'improvedigital.com',
  'spotxchange.com',
  'spotx.tv',
  'sascdn.com',
  'onaudience.com',
  'semasio.net',
  'permutive.com',
  'permutive.app',
  'weborama.fr',
  'weborama.com',
  'cxense.com',
  'cxpublic.com',
  'liadm.com',
  'crwdcntrl.net',
  'tapad.com',
  'pippio.com',
  'districtm.io',
  'yieldmo.com',
  'zqtk.net',
  // Social pixels / conversion tags (specific paths, won't break the sites)
  'facebook.com/tr',
  'ads.linkedin.com',
  'px.ads.linkedin.com',
  'snap.licdn.com',
  'bat.bing.com',
  'ads-twitter.com',
  'analytics.twitter.com',
  't.co/i/adsct',
  'tr.snapchat.com',
  'sc-static.net',
  'pinterest.com/ct',
  'ct.pinterest.com',
  // Analytics / tag managers / consent-analytics
  'sb.scorecardresearch.com',
  'cdn.cxense.com',
  'smetrics',
  'sitestat.com',
  'chartbeat.net',
  'log.pinterest.com',
];

/**
 * Coarse block check: true if the URL's host contains any blocked domain.
 * Substring match keeps it simple and dependency-free; refined per-request
 * filtering lands in Phase 2.
 */
export const isBlockedUrl = (url: string): boolean => {
  if (!url) {return false;}
  const lower = url.toLowerCase();
  return TRACKER_DOMAINS.some(domain => lower.includes(domain));
};
