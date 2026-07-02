// DNS-over-HTTPS providers. Single source of truth for both the URL map
// (used to configure the platform resolver) and the UI picker list.
export const DOH_PROVIDERS = {
  mullvad: 'https://dns.mullvad.net/dns-query',
  adguard: 'https://dns.adguard-dns.com/dns-query',
  nextdns: 'https://dns.nextdns.io/YOUR_ID',
  cloudflare: 'https://cloudflare-dns.com/dns-query',
} as const;

export type DohProviderId = keyof typeof DOH_PROVIDERS;

// DoT (DNS-over-TLS) hostnames for Android's system "Private DNS" setting.
// Android encrypts DNS device-wide via DoT (not DoH) — this is the hostname the
// user sets there, and what our native module compares against to report state.
export const DOT_HOSTNAMES: Record<DohProviderId, string> = {
  mullvad: 'dns.mullvad.net',
  adguard: 'dns.adguard-dns.com',
  nextdns: 'dns.nextdns.io', // note: real use needs your profile id: <id>.dns.nextdns.io
  cloudflare: 'one.one.one.one',
};

export interface DohProviderInfo {
  id: DohProviderId;
  label: string;
  subtitle: string;
  url: string;
  /** DoT hostname for Android Private DNS. */
  dot: string;
}

export const DOH_PROVIDER_LIST: DohProviderInfo[] = [
  {id: 'mullvad', label: 'Mullvad DNS', subtitle: 'dns.mullvad.net', url: DOH_PROVIDERS.mullvad, dot: DOT_HOSTNAMES.mullvad},
  {id: 'adguard', label: 'AdGuard DNS', subtitle: 'dns.adguard-dns.com', url: DOH_PROVIDERS.adguard, dot: DOT_HOSTNAMES.adguard},
  {id: 'nextdns', label: 'NextDNS', subtitle: 'dns.nextdns.io', url: DOH_PROVIDERS.nextdns, dot: DOT_HOSTNAMES.nextdns},
  {id: 'cloudflare', label: 'Cloudflare', subtitle: 'one.one.one.one', url: DOH_PROVIDERS.cloudflare, dot: DOT_HOSTNAMES.cloudflare},
];
