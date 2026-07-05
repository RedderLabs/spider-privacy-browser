/**
 * @format
 * Tests for the coarse tracker blocklist in @spider/network.
 */
import {describe, it, expect} from '@jest/globals';
import {isBlockedUrl, TRACKER_DOMAINS} from '@spider/network';

describe('isBlockedUrl', () => {
  it('blocks known tracker hosts', () => {
    expect(isBlockedUrl('https://www.google-analytics.com/collect')).toBe(true);
    expect(isBlockedUrl('https://connect.facebook.net/en_US/fbevents.js')).toBe(true);
    expect(isBlockedUrl('https://pagead2.googlesyndication.com/pagead/js')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isBlockedUrl('https://DoubleClick.NET/ad')).toBe(true);
  });

  it('allows non-tracker hosts', () => {
    expect(isBlockedUrl('https://en.wikipedia.org/wiki/Privacy')).toBe(false);
    expect(isBlockedUrl('https://duckduckgo.com/?q=test')).toBe(false);
  });

  it('handles empty / missing input safely', () => {
    expect(isBlockedUrl('')).toBe(false);
  });

  it('has no duplicate domains in the base list', () => {
    expect(new Set(TRACKER_DOMAINS).size).toBe(TRACKER_DOMAINS.length);
  });
});
