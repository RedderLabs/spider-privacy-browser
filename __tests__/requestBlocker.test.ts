/**
 * @format
 * Tests for the in-page request blocker builder in @spider/privacy-js.
 */
import {describe, it, expect} from '@jest/globals';
import {buildRequestBlocker} from '@spider/privacy-js';

describe('buildRequestBlocker', () => {
  it('embeds the given domains (lowercased) into the script', () => {
    const js = buildRequestBlocker(['DoubleClick.net', 'evil-tracker.com']);
    expect(js).toContain('doubleclick.net');
    expect(js).toContain('evil-tracker.com');
  });

  it('wraps the network APIs and reports blocks', () => {
    const js = buildRequestBlocker(['x.com']);
    expect(js).toContain('window.fetch');
    expect(js).toContain('XMLHttpRequest.prototype.open');
    expect(js).toContain('XMLHttpRequest.prototype.send');
    expect(js).toContain('navigator.sendBeacon');
    expect(js).toContain('__spider');
    // Self-contained IIFE.
    expect(js.trim().startsWith('(function()')).toBe(true);
    expect(js.trim().endsWith('})();')).toBe(true);
  });

  it('produces valid, parseable JS (no syntax errors)', () => {
    const js = buildRequestBlocker(['a.com', 'b.net']);
    // Throws if the generated source has a syntax error.
    // eslint-disable-next-line no-new-func -- intentional: syntax-checking generated JS
    expect(() => new Function(js)).not.toThrow();
  });
});
