// Spider Privacy Browser's own block list, in EasyList/AdGuard network-rule
// syntax. This is the single, human-editable source of truth for the filter
// pipeline — edit the rules below and the runtime host list (Android) and
// WKContentRuleList (iOS) recompute on next launch. See docs/CONTENT_BLOCKING.md
// for the syntax and how to fold in upstream lists (EasyList / EasyPrivacy /
// AdGuard Base).
//
// Only NETWORK rules are honored (`||host^`, `$third-party`, `@@` exceptions,
// hosts-file lines). Cosmetic rules (`##selector`) are ignored on purpose.
export const SPIDER_FILTERS = String.raw`
! ---- Ad networks / exchanges / SSPs ----
||adsystem.com^$third-party
||advertising.com^$third-party
||adtechus.com^$third-party
||serving-sys.com^$third-party
||contextweb.com^$third-party
||bidr.io^$third-party
||stickyadstv.com^$third-party
||3lift.com^$third-party
||adnxs-simple.com^$third-party
||adsafeprotected.com^$third-party
||g.doubleclick.net^$third-party
||omnitagjs.com^$third-party
||zorosrv.com^$third-party
||ad-delivery.net^$third-party
||adkernel.com^$third-party
||adotmob.com^$third-party
||districtm.io^$third-party
||sonobi.com^$third-party
||themediagrid.com^$third-party
||undertone.com^$third-party
||adyoulike.com^$third-party
||lijit.com^$third-party
||smaato.net^$third-party
||mfadsrvr.com^$third-party
||mgid.com^$third-party
||revcontent.com^$third-party

! ---- Analytics / telemetry ----
||analytics.yahoo.com^
||heapanalytics.com^
||matomo.cloud^
||statcounter.com^
||woopra.com^
||loggly.com^
||datadoghq-browser-agent.com^
||logrocket.io^
||logrocket.com^
||pendo.io^
||optimizely.com^
||omappapi.com^
||quantummetric.com^
||contentsquare.net^
||inspectlet.com^
||smartlook.com^

! ---- Fingerprinting / device-graph ----
||fingerprintjs.com^
||fpjs.io^
||iovation.com^
||perimeterx.net^
||sift.com^$third-party
||threatmetrix.com^

! ---- Social widgets / pixels (third-party only) ----
||platform.twitter.com^$third-party
||syndication.twitter.com^$third-party
||apis.google.com^$third-party
||assets.pinterest.com^$third-party

! ---- Example allow-list exception (keep a first-party analytics host reachable) ----
@@||analytics.google.com^

! ---- Hosts-file style entries also parse ----
0.0.0.0 tracking.example-ads.net
0.0.0.0 metrics.example-telemetry.com
`;
