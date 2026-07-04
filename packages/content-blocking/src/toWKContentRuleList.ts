// Emit a Safari `WKContentRuleList` JSON string from parsed filter rules (iOS).
//
// WKContentRuleList is a JSON array of {trigger, action} objects. For a host
// block we match the resource URL with a `url-filter` regex anchored on the
// host, mirroring the standard AdGuard/EasyList -> Safari conversion. When the
// source rule was `$third-party`, we scope it with `load-type: ["third-party"]`.
//
// Apple caps a compiled rule list at ~150k rules; our lists are far smaller, but
// `toWKContentRuleList` still de-dupes so we never emit redundant triggers.

import { ParsedFilterList } from './parseFilterList';

export interface WKRule {
  trigger: {
    'url-filter': string;
    'url-filter-is-case-sensitive'?: boolean;
    'load-type'?: string[];
  };
  action: { type: 'block' };
}

// Escape a host for use inside a WKContentRuleList `url-filter` regex. Only `.`
// is special among the characters a valid host can contain.
function escapeHost(host: string): string {
  return host.replace(/\./g, '\\.');
}

/**
 * Build the `url-filter` for a host: match `scheme://[any.sub.]host` followed by
 * a port/path/query/fragment separator or end-of-string, case-insensitively.
 * Subdomains are covered by the optional `([a-z0-9-]+\.)*` group, so a single
 * rule for `example.com` also blocks `ads.example.com`.
 */
function hostUrlFilter(host: string): string {
  return `^https?://([a-z0-9-]+\\.)*${escapeHost(host)}([/:?#]|$)`;
}

/**
 * Convert parsed rules to a WKContentRuleList JSON string. Exception (`@@`)
 * hosts are removed from the block set; `seedDomains` (e.g. `TRACKER_DOMAINS`)
 * are folded in as plain host blocks.
 */
export function toWKContentRuleList(
  parsed: ParsedFilterList,
  seedDomains: string[] = [],
): string {
  const allow = new Set(parsed.allow.map(h => h.toLowerCase()));
  // host -> thirdParty. A host that appears both as third-party-only and as an
  // unconditional block collapses to the broader (unconditional) block.
  const byHost = new Map<string, boolean>();

  const add = (host: string, thirdParty: boolean) => {
    const h = host.trim().toLowerCase();
    // Only whole hosts map to a host `url-filter`; skip path-specific or
    // wildcard seed entries (parser-produced block hosts are already valid).
    if (
      !h ||
      allow.has(h) ||
      !h.includes('.') ||
      /[/:*\s]/.test(h)
    ) {
      return;
    }
    if (byHost.has(h)) {
      byHost.set(h, byHost.get(h)! && thirdParty);
    } else {
      byHost.set(h, thirdParty);
    }
  };

  for (const d of seedDomains) {
    add(d, false);
  }
  for (const entry of parsed.block) {
    add(entry.host, entry.thirdParty);
  }

  const rules: WKRule[] = Array.from(byHost.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([host, thirdParty]) => {
      const rule: WKRule = {
        trigger: {
          'url-filter': hostUrlFilter(host),
          'url-filter-is-case-sensitive': false,
        },
        action: { type: 'block' },
      };
      if (thirdParty) {
        rule.trigger['load-type'] = ['third-party'];
      }
      return rule;
    });

  return JSON.stringify(rules);
}
