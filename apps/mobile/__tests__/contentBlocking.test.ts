/**
 * @format
 * Tests for the @spider/content-blocking filter-list pipeline: the
 * EasyList/AdGuard parser, the host-list emitter (Android) and the
 * WKContentRuleList emitter (iOS), plus the computed runtime artifacts.
 */
import {describe, it, expect} from '@jest/globals';
import {
  parseFilterList,
  toHostList,
  toWKContentRuleList,
  BLOCKED_HOSTS,
  WK_CONTENT_RULES_JSON,
} from '@spider/content-blocking';
import {TRACKER_DOMAINS} from '@spider/network';

describe('parseFilterList', () => {
  it('parses ||host^ network rules', () => {
    const {block} = parseFilterList('||ads.example.com^');
    expect(block).toEqual([{host: 'ads.example.com', thirdParty: false}]);
  });

  it('captures the $third-party option', () => {
    const {block} = parseFilterList('||tracker.net^$third-party');
    expect(block[0]).toEqual({host: 'tracker.net', thirdParty: true});
  });

  it('drops the path from ||host/path rules but keeps the host', () => {
    const {block} = parseFilterList('||example.com/ads/banner.js');
    expect(block[0].host).toBe('example.com');
  });

  it('parses hosts-file lines', () => {
    const {block} = parseFilterList('0.0.0.0 metrics.tracker.com');
    expect(block[0].host).toBe('metrics.tracker.com');
  });

  it('records @@ exceptions as allow entries, not blocks', () => {
    const {block, allow} = parseFilterList('@@||cdn.example.com^');
    expect(block).toHaveLength(0);
    expect(allow).toEqual(['cdn.example.com']);
  });

  it('ignores comments, headers and cosmetic rules', () => {
    const {block} = parseFilterList(
      ['! comment', '# hosts comment', '[Adblock Plus]', 'example.com##.ad', 'example.org#@#.x'].join(
        '\n',
      ),
    );
    expect(block).toHaveLength(0);
  });

  it('skips rules with non-enforceable options (domain=/csp=/redirect=)', () => {
    const {block} = parseFilterList(
      ['||a.com^$domain=x.com', '||b.com^$csp=script-src', '||c.com^$redirect=noop'].join('\n'),
    );
    expect(block).toHaveLength(0);
  });

  it('keeps rules whose only options are resource types', () => {
    const {block} = parseFilterList('||d.com^$script,image,third-party');
    expect(block[0]).toEqual({host: 'd.com', thirdParty: true});
  });

  it('rejects malformed / wildcard hosts', () => {
    const {block} = parseFilterList(['||*.com^', '||not a host^', '||-.^'].join('\n'));
    expect(block).toHaveLength(0);
  });
});

describe('toHostList', () => {
  it('unions seed domains with parsed blocks, deduped and sorted', () => {
    const parsed = parseFilterList('||b.com^\n||a.com^');
    expect(toHostList(parsed, ['c.com', 'a.com'])).toEqual(['a.com', 'b.com', 'c.com']);
  });

  it('removes allow-listed hosts from the result', () => {
    const parsed = parseFilterList('||keep.com^\n@@||drop.com^');
    expect(toHostList(parsed, ['drop.com'])).toEqual(['keep.com']);
  });

  it('drops path-specific / non-host seed entries', () => {
    const parsed = parseFilterList('');
    expect(toHostList(parsed, ['facebook.com/tr', 'good.com', 'no-dot'])).toEqual(['good.com']);
  });
});

describe('toWKContentRuleList', () => {
  it('emits one block rule per host with an anchored url-filter', () => {
    const rules = JSON.parse(toWKContentRuleList(parseFilterList('||ads.example.com^')));
    expect(rules).toHaveLength(1);
    expect(rules[0].action).toEqual({type: 'block'});
    expect(rules[0].trigger['url-filter']).toContain('ads\\.example\\.com');
  });

  it('scopes $third-party rules with load-type', () => {
    const rules = JSON.parse(toWKContentRuleList(parseFilterList('||t.net^$third-party')));
    expect(rules[0].trigger['load-type']).toEqual(['third-party']);
  });

  it('omits load-type for unconditional blocks', () => {
    const rules = JSON.parse(toWKContentRuleList(parseFilterList('||t.net^')));
    expect(rules[0].trigger['load-type']).toBeUndefined();
  });

  it('honors allow-list exceptions', () => {
    const rules = JSON.parse(toWKContentRuleList(parseFilterList('||x.com^\n@@||x.com^')));
    expect(rules).toHaveLength(0);
  });

  it('produces valid JSON that round-trips', () => {
    expect(() => JSON.parse(WK_CONTENT_RULES_JSON)).not.toThrow();
  });
});

describe('runtime artifacts', () => {
  it('BLOCKED_HOSTS is a deduped superset of the plain-host TRACKER_DOMAINS', () => {
    expect(new Set(BLOCKED_HOSTS).size).toBe(BLOCKED_HOSTS.length);
    const plainSeed = TRACKER_DOMAINS.filter(
      d => d.includes('.') && !/[/:*\s]/.test(d),
    );
    for (const d of plainSeed) {
      expect(BLOCKED_HOSTS).toContain(d.toLowerCase());
    }
    expect(BLOCKED_HOSTS.length).toBeGreaterThan(plainSeed.length);
  });

  it('picks up new hosts contributed by SPIDER_FILTERS', () => {
    expect(BLOCKED_HOSTS).toContain('fingerprintjs.com');
    expect(BLOCKED_HOSTS).toContain('smaato.net');
  });

  it('applies the SPIDER_FILTERS allow-list exception', () => {
    // analytics.google.com is @@-excepted in spiderFilters.
    expect(BLOCKED_HOSTS).not.toContain('analytics.google.com');
  });

  it('WK_CONTENT_RULES_JSON has one rule per blocked host', () => {
    const rules = JSON.parse(WK_CONTENT_RULES_JSON);
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });
});
