/* eslint-disable sonarjs/no-hardcoded-ip -- test fixtures require hardcoded IPs */
import { isValidCidr, isIpInCidrs, parseCidr } from './cidr.util';

describe('isValidCidr', () => {
  it('should accept a valid IPv4 CIDR', () => {
    expect(isValidCidr('192.168.1.0/24')).toBe(true);
  });

  it('should accept a valid IPv4 single-host CIDR', () => {
    expect(isValidCidr('10.0.0.1/32')).toBe(true);
  });

  it('should accept a broad IPv4 CIDR', () => {
    expect(isValidCidr('10.0.0.0/8')).toBe(true);
  });

  it('should accept a single IPv4 address without prefix', () => {
    expect(isValidCidr('192.168.1.1')).toBe(true);
  });

  it('should accept a valid IPv6 CIDR', () => {
    expect(isValidCidr('2001:db8::/32')).toBe(true);
  });

  it('should accept a full IPv6 address without prefix', () => {
    expect(isValidCidr('::1')).toBe(true);
  });

  it('should accept IPv6 /128 prefix', () => {
    expect(isValidCidr('2001:db8::1/128')).toBe(true);
  });

  it('should reject an invalid IP address', () => {
    expect(isValidCidr('999.999.999.999/24')).toBe(false);
  });

  it('should reject a CIDR with negative prefix', () => {
    expect(isValidCidr('192.168.1.0/-1')).toBe(false);
  });

  it('should reject an IPv4 CIDR with prefix > 32', () => {
    expect(isValidCidr('192.168.1.0/33')).toBe(false);
  });

  it('should reject an IPv6 CIDR with prefix > 128', () => {
    expect(isValidCidr('2001:db8::/129')).toBe(false);
  });

  it('should reject a non-numeric prefix', () => {
    expect(isValidCidr('192.168.1.0/abc')).toBe(false);
  });

  it('should reject an empty string', () => {
    expect(isValidCidr('')).toBe(false);
  });

  it('should reject a string with multiple slashes', () => {
    expect(isValidCidr('192.168.1.0/24/16')).toBe(false);
  });

  it('should reject a floating-point prefix', () => {
    expect(isValidCidr('192.168.1.0/24.5')).toBe(false);
  });

  it('should reject a trailing slash without prefix', () => {
    expect(isValidCidr('192.168.1.0/')).toBe(false);
  });

  it('should reject an IPv6 trailing slash without prefix', () => {
    expect(isValidCidr('2001:db8::/')).toBe(false);
  });

  it('should reject a whitespace-only prefix', () => {
    expect(isValidCidr('10.0.0.1/ ')).toBe(false);
  });

  it('should reject a prefix with leading whitespace', () => {
    expect(isValidCidr('10.0.0.1/ 24')).toBe(false);
  });

  it('should reject a prefix with trailing whitespace', () => {
    expect(isValidCidr('10.0.0.1/24 ')).toBe(false);
  });

  it('should reject a tab character in prefix', () => {
    expect(isValidCidr('10.0.0.1/\t8')).toBe(false);
  });
});

describe('parseCidr', () => {
  it('should parse a valid IPv4 CIDR', () => {
    expect(parseCidr('192.168.1.0/24')).toEqual({
      address: '192.168.1.0',
      prefix: 24,
      type: 'ipv4',
    });
  });

  it('should parse a single IPv4 address as /32', () => {
    expect(parseCidr('10.0.0.1')).toEqual({
      address: '10.0.0.1',
      prefix: 32,
      type: 'ipv4',
    });
  });

  it('should parse a valid IPv6 CIDR', () => {
    expect(parseCidr('2001:db8::/32')).toEqual({
      address: '2001:db8::',
      prefix: 32,
      type: 'ipv6',
    });
  });

  it('should parse a single IPv6 address as /128', () => {
    expect(parseCidr('::1')).toEqual({
      address: '::1',
      prefix: 128,
      type: 'ipv6',
    });
  });

  it('should return null for whitespace prefix', () => {
    expect(parseCidr('10.0.0.1/ ')).toBeNull();
  });

  it('should return null for invalid input', () => {
    expect(parseCidr('not-an-ip/24')).toBeNull();
  });

  it('should return null for trailing slash', () => {
    expect(parseCidr('10.0.0.1/')).toBeNull();
  });

  it('should return null for prefix exceeding max', () => {
    expect(parseCidr('10.0.0.1/33')).toBeNull();
  });
});

describe('isIpInCidrs', () => {
  it('should return true when IP is within a CIDR range', () => {
    expect(isIpInCidrs('192.168.1.100', ['192.168.1.0/24'])).toBe(true);
  });

  it('should return false when IP is outside a CIDR range', () => {
    expect(isIpInCidrs('10.0.0.1', ['192.168.1.0/24'])).toBe(false);
  });

  it('should match across multiple CIDRs', () => {
    const cidrs = ['10.0.0.0/8', '172.16.0.0/12'];
    expect(isIpInCidrs('172.16.5.10', cidrs)).toBe(true);
  });

  it('should return false when no CIDRs match', () => {
    const cidrs = ['10.0.0.0/8', '172.16.0.0/12'];
    expect(isIpInCidrs('192.168.1.1', cidrs)).toBe(false);
  });

  it('should return false for an empty CIDR list', () => {
    expect(isIpInCidrs('192.168.1.1', [])).toBe(false);
  });

  it('should match an exact single IP CIDR', () => {
    expect(isIpInCidrs('203.0.113.50', ['203.0.113.50/32'])).toBe(true);
  });

  it('should not match a different IP against a single IP CIDR', () => {
    expect(isIpInCidrs('203.0.113.51', ['203.0.113.50/32'])).toBe(false);
  });

  it('should match an IPv6 address within a CIDR range', () => {
    expect(isIpInCidrs('2001:db8::1', ['2001:db8::/32'])).toBe(true);
  });

  it('should not match an IPv6 address outside a CIDR range', () => {
    expect(isIpInCidrs('2001:db9::1', ['2001:db8::/32'])).toBe(false);
  });

  it('should match a single IP without prefix notation', () => {
    expect(isIpInCidrs('10.0.0.1', ['10.0.0.1'])).toBe(true);
  });

  it('should not match a different IP against a single IP without prefix', () => {
    expect(isIpInCidrs('10.0.0.2', ['10.0.0.1'])).toBe(false);
  });

  it('should return false for an invalid IP address', () => {
    expect(isIpInCidrs('not-an-ip', ['192.168.1.0/24'])).toBe(false);
  });

  it('should skip invalid CIDRs gracefully', () => {
    expect(isIpInCidrs('10.0.0.1', ['invalid', '10.0.0.0/8'])).toBe(true);
  });

  it('should skip CIDRs with a valid IP but invalid prefix', () => {
    expect(isIpInCidrs('10.0.0.1', ['10.0.0.0/abc'])).toBe(false);
  });

  it('should not throw for a CIDR with NaN prefix', () => {
    expect(() => isIpInCidrs('10.0.0.1', ['10.0.0.0/abc'])).not.toThrow();
  });

  it('should match an IPv4-mapped IPv6 address against an IPv4 CIDR', () => {
    expect(isIpInCidrs('::ffff:192.168.1.50', ['192.168.1.0/24'])).toBe(true);
  });

  it('should not match an IPv4-mapped IPv6 address outside an IPv4 CIDR', () => {
    expect(isIpInCidrs('::ffff:10.0.0.1', ['192.168.1.0/24'])).toBe(false);
  });

  it('should match an IPv4-mapped IPv6 address against exact single IP', () => {
    expect(isIpInCidrs('::ffff:203.0.113.50', ['203.0.113.50/32'])).toBe(true);
  });

  it('should handle uppercase ::FFFF: prefix', () => {
    expect(isIpInCidrs('::FFFF:192.168.1.50', ['192.168.1.0/24'])).toBe(true);
  });

  it('should not match any IP against a trailing-slash CIDR', () => {
    expect(isIpInCidrs('192.168.1.1', ['192.168.1.0/'])).toBe(false);
  });

  it('should not match any IP against a whitespace-prefix CIDR', () => {
    expect(isIpInCidrs('10.0.0.1', ['10.0.0.1/ '])).toBe(false);
  });

  it('should not match when whitespace prefix would coerce to /0', () => {
    expect(isIpInCidrs('8.8.8.8', ['10.0.0.1/ '])).toBe(false);
  });
});
