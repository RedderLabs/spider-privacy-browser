// Emit a deduped, allow-list-filtered host array from parsed filter rules.
//
// This is the list the Android native blocker consumes (pushed via the
// `NativeBlocklist` bridge) and the in-page JS blocker matches against. It is a
// plain string[] of registrable hosts, sorted for stable diffs.

import { ParsedFilterList } from './parseFilterList';

// A host-based blocker can only enforce whole hosts. Some seed entries (e.g.
// `facebook.com/tr`, `yandex.ru/metrika`) are path-specific and only meaningful
// to the substring/in-page matcher — keeping them here is dead weight, and
// reducing them to their bare host would over-block the whole site. So we drop
// any seed that isn't a plain host (contains a path/wildcard or lacks a dot).
function isPlainHost(value: string): boolean {
  return (
    value.length > 0 &&
    value.includes('.') &&
    !value.includes('/') &&
    !value.includes('*') &&
    !value.includes(':') &&
    !value.includes(' ')
  );
}

/**
 * Merge parsed block entries with any number of seed domains (e.g. the curated
 * `TRACKER_DOMAINS`), drop anything an `@@` exception allow-listed, dedupe, and
 * sort. `thirdParty` is not represented here — a host block is coarser than the
 * rule, which is the intended trade-off for the native/JS host matcher.
 */
export function toHostList(
  parsed: ParsedFilterList,
  seedDomains: string[] = [],
): string[] {
  const allow = new Set(parsed.allow.map(h => h.toLowerCase()));
  const hosts = new Set<string>();

  for (const d of seedDomains) {
    const host = d.trim().toLowerCase();
    if (isPlainHost(host) && !allow.has(host)) {
      hosts.add(host);
    }
  }
  for (const entry of parsed.block) {
    if (!allow.has(entry.host)) {
      hosts.add(entry.host);
    }
  }

  return Array.from(hosts).sort();
}
