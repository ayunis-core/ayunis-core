/* eslint-disable sonarjs/no-hardcoded-ip -- IP literals are inputs the allowlist must reject. */
import {
  AllowedDomains,
  InvalidAllowedDomainError,
  normalizeAllowedDomain,
} from './allowed-domains';

describe('normalizeAllowedDomain', () => {
  it.each([
    ['  NRW.de  ', 'nrw.de'],
    ['recht.nrw.de.', 'recht.nrw.de'],
    ['https://Recht.NRW.de:8443/gv/2026?seite=2#top', 'recht.nrw.de'],
    ['recht.nrw.de/bekanntmachungen', 'recht.nrw.de'],
    ['münchen.de', 'xn--mnchen-3ya.de'],
    ['https://www.köln.de/', 'www.xn--kln-sna.de'],
  ])('reduces %p to the host %p', (input, host) => {
    expect(normalizeAllowedDomain(input)).toBe(host);
  });

  it.each([
    ['192.168.1.10', 'ip-address'],
    ['https://127.1/', 'ip-address'],
    ['[2001:db8::1]', 'ip-address'],
    ['*.nrw.de', 'wildcard'],
    ['nrw.*', 'wildcard'],
    ['localhost', 'missing-dot'],
    ['https://intranet/', 'missing-dot'],
    ['', 'invalid'],
    ['nrw .de', 'invalid'],
    ['nrw..de', 'invalid'],
    ['-nrw.de', 'invalid'],
  ])('rejects %p as %p', (input, reason) => {
    expect(() => normalizeAllowedDomain(input)).toThrow(
      expect.objectContaining({
        constructor: InvalidAllowedDomainError,
        reason,
      }) as Error,
    );
  });
});

describe('AllowedDomains', () => {
  const allowed = new AllowedDomains(['nrw.de', 'münchen.de']);

  it('normalizes and deduplicates its entries', () => {
    expect(
      new AllowedDomains(['NRW.de', 'https://nrw.de/', 'nrw.de.', 'bund.de'])
        .entries,
    ).toEqual(['nrw.de', 'bund.de']);
  });

  it('rejects an invalid entry', () => {
    expect(() => new AllowedDomains(['nrw.de', '*.bund.de'])).toThrow(
      InvalidAllowedDomainError,
    );
  });

  it.each(['nrw.de', 'recht.nrw.de', 'www.landtag.nrw.de'])(
    'allows the entry and its subdomains: %p',
    (host) => {
      expect(allowed.allowsHost(host)).toBe(true);
    },
  );

  it.each(['evilnrw.de', 'nrw.de.evil.com', 'de', 'nrw.de-evil.com'])(
    'denies the look-alike host %p',
    (host) => {
      expect(allowed.allowsHost(host)).toBe(false);
    },
  );

  it('matches hosts case-insensitively and ignores a trailing dot', () => {
    expect(allowed.allowsHost('Recht.NRW.de.')).toBe(true);
  });

  it('matches internationalized hosts in unicode and punycode form', () => {
    expect(allowed.allowsHost('rathaus.münchen.de')).toBe(true);
    expect(allowed.allowsHost('rathaus.xn--mnchen-3ya.de')).toBe(true);
  });

  it('checks the host the URL parser resolves, not a prefix of the URL', () => {
    expect(allowed.allowsUrl('https://recht.nrw.de/gv/2026')).toBe(true);
    expect(allowed.allowsUrl('https://nrw.de@evil.com/gv')).toBe(false);
    expect(allowed.allowsUrl('https://evil.com/?next=https://nrw.de')).toBe(
      false,
    );
    expect(allowed.allowsUrl('https://RECHT.NRW.DE./')).toBe(true);
  });

  it('denies an unparsable URL', () => {
    expect(allowed.allowsUrl('not a url')).toBe(false);
  });

  it('allows nothing when it has no entries', () => {
    expect(new AllowedDomains([]).allowsHost('nrw.de')).toBe(false);
  });
});
