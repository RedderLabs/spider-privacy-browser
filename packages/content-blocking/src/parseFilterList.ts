// Parser for the blockable subset of EasyList / AdGuard filter-list syntax.
//
// This is intentionally NOT a full ABP engine: it extracts the network rules we
// can enforce with a host-based blocker (Android `shouldInterceptRequest`) and
// with Safari `WKContentRuleList` (iOS). Cosmetic/element-hiding rules
// (`##selector`, `#@#`) and rules we can't represent by host are skipped.
//
// Supported input, one rule per line:
//   ||example.com^                block example.com and its subdomains
//   ||example.com^$third-party    same, only when loaded as a third party
//   ||example.com/path            path is dropped; the host is blocked
//   example.com                   bare host (plain or hosts-file style)
//   0.0.0.0 example.com           hosts-file line; the mapped host is blocked
//   @@||example.com^              exception: the host is allow-listed (removed)
//   ! comment  /  # comment       ignored
//
// The result is a normalized set of {host, thirdParty} block entries plus an
// allow-list of hosts, so downstream emitters (host list / WKContentRuleList)
// don't need to know about filter syntax.

export interface FilterEntry {
  /** Registrable host to block, lower-cased, no scheme/port/path. */
  host: string;
  /** True when the source rule carried `$third-party` (or `$3p`). */
  thirdParty: boolean;
}

export interface ParsedFilterList {
  block: FilterEntry[];
  /** Hosts that an `@@` exception rule explicitly allow-lists. */
  allow: string[];
}

const HOSTS_FILE_IPS = new Set(['0.0.0.0', '127.0.0.1', '::1', '::']);

// A conservative host validator: letters/digits/hyphen labels joined by dots,
// at least one dot, no wildcards. We reject anything with a `*`, `/`, or regex
// markers so a malformed rule never becomes a bogus block entry.
const HOST_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function isValidHost(host: string): boolean {
  return HOST_RE.test(host);
}

/** Pull the `$third-party` flag out of a rule's options segment. */
function hasThirdParty(options: string | undefined): boolean {
  if (!options) {
    return false;
  }
  return options
    .split(',')
    .some(opt => opt === 'third-party' || opt === '3p');
}

// A rule's options are enforceable as a blanket host block only when none of
// them narrows the rule to a specific document/response we can't express by host
// (e.g. `domain=`, `csp=`, `redirect=`). Resource-type options (script, image,
// xmlhttprequest, …) are fine — a host block is a superset of them.
function optionsAreEnforceable(options: string | undefined): boolean {
  if (!options) {
    return true;
  }
  return options.split(',').every(opt => {
    const bare = opt.startsWith('~') ? opt.slice(1) : opt;
    // Resource-type options (script, image, xmlhttprequest, ...) are fine: a
    // host block is a superset of them. `domain=`/`csp=`/`redirect=` are not.
    if (bare.includes('=')) {
      return false;
    }
    return true;
  });
}

/** Strip a `||host^…` / `host/path` / bare-host rule down to its host. */
function extractHost(pattern: string): string | null {
  let p = pattern.trim().toLowerCase();
  if (!p) {
    return null;
  }
  // `||` anchors the domain start in ABP syntax.
  if (p.startsWith('||')) {
    p = p.slice(2);
  }
  // Drop a leading scheme if present (`https://`, `//`).
  p = p.replace(/^https?:\/\//, '').replace(/^\/\//, '');
  // Cut at the first path/separator/anchor character; `^` is the ABP separator.
  p = p.split(/[/^?#]/, 1)[0];
  // Drop a port.
  p = p.split(':', 1)[0];
  // A wildcard host can't be a plain block entry.
  if (!p || p.includes('*')) {
    return null;
  }
  return isValidHost(p) ? p : null;
}

/** Parse a whole filter list (newline-separated) into normalized entries. */
export function parseFilterList(text: string): ParsedFilterList {
  const block: FilterEntry[] = [];
  const allow: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    // Comments: EasyList `!`, hosts-file `#`, and AdGuard `[Adblock ...]` headers.
    if (line.startsWith('!') || line.startsWith('#') || line.startsWith('[')) {
      continue;
    }
    // Cosmetic / element-hiding rules — not network rules, skip.
    if (line.includes('##') || line.includes('#@#') || line.includes('#?#')) {
      continue;
    }
    // Regex rules (`/…/`) are unsupported for host extraction.
    if (line.startsWith('/') && line.endsWith('/')) {
      continue;
    }

    // Hosts-file line: `0.0.0.0 tracker.com` (possibly with a trailing comment).
    const hostsMatch = line.match(/^(\S+)\s+(\S+)/);
    if (hostsMatch && HOSTS_FILE_IPS.has(hostsMatch[1])) {
      const host = hostsMatch[2].toLowerCase();
      if (isValidHost(host)) {
        block.push({ host, thirdParty: false });
      }
      continue;
    }

    // Exception rule.
    const isException = line.startsWith('@@');
    const body = isException ? line.slice(2) : line;

    // Split off the `$options` segment.
    const dollar = body.indexOf('$');
    const pattern = dollar >= 0 ? body.slice(0, dollar) : body;
    const options = dollar >= 0 ? body.slice(dollar + 1) : undefined;

    if (!optionsAreEnforceable(options)) {
      continue;
    }

    const host = extractHost(pattern);
    if (!host) {
      continue;
    }

    if (isException) {
      allow.push(host);
    } else {
      block.push({ host, thirdParty: hasThirdParty(options) });
    }
  }

  return { block, allow };
}
