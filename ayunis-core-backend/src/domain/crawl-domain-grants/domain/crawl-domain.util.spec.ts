import { normalizeHost } from './crawl-domain.util';
import { InvalidCrawlDomainError } from './crawl-domain.errors';

describe('normalizeHost', () => {
  it('lowercases and extracts the host from a full URL', () => {
    expect(normalizeHost('https://Intranet.Customer.DE/wiki/page?x=1')).toBe(
      'intranet.customer.de',
    );
  });

  it('accepts a bare host unchanged', () => {
    expect(normalizeHost('intranet.customer.de')).toBe('intranet.customer.de');
  });

  it('strips a port', () => {
    expect(normalizeHost('https://intranet.customer.de:8443/path')).toBe(
      'intranet.customer.de',
    );
  });

  it('strips a trailing FQDN dot', () => {
    expect(normalizeHost('intranet.customer.de.')).toBe('intranet.customer.de');
  });

  it('throws for an empty/blank input', () => {
    expect(() => normalizeHost('   ')).toThrow(InvalidCrawlDomainError);
  });

  it('throws when the host contains whitespace', () => {
    expect(() => normalizeHost('not a host')).toThrow(InvalidCrawlDomainError);
  });
});
