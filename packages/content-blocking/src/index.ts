// @spider/content-blocking — filter-list pipeline.
//
// Converts EasyList/AdGuard network rules (the maintainable SPIDER_FILTERS list)
// plus the curated TRACKER_DOMAINS seed into the two artifacts the app enforces:
//   - BLOCKED_HOSTS: a host list for the Android native blocker + JS blocker
//   - WK_CONTENT_RULES_JSON: a WKContentRuleList JSON string for iOS
//
// Both are computed once at module load (parsing the small filter list is
// microseconds) and memoized, so app code just imports the ready values.
import { TRACKER_DOMAINS } from '@spider/network';
import { parseFilterList } from './parseFilterList';
import { toHostList } from './toHostList';
import { toWKContentRuleList } from './toWKContentRuleList';
import { SPIDER_FILTERS } from './spiderFilters';

export * from './parseFilterList';
export * from './toHostList';
export * from './toWKContentRuleList';
export { SPIDER_FILTERS } from './spiderFilters';

const parsed = parseFilterList(SPIDER_FILTERS);

/**
 * Deduped, allow-list-filtered host list: the curated TRACKER_DOMAINS seed
 * unioned with every host block parsed from SPIDER_FILTERS. Fed to the Android
 * native blocker (via the NativeBlocklist bridge) and matched by the in-page
 * JS blocker. Superset of TRACKER_DOMAINS.
 */
export const BLOCKED_HOSTS: string[] = toHostList(parsed, TRACKER_DOMAINS);

/**
 * WKContentRuleList JSON (iOS): one block rule per host, `$third-party` rules
 * scoped with `load-type: ["third-party"]`. Passed to the native
 * SpiderContentBlocker module, which compiles it via WKContentRuleListStore.
 */
export const WK_CONTENT_RULES_JSON: string = toWKContentRuleList(
  parsed,
  TRACKER_DOMAINS,
);
