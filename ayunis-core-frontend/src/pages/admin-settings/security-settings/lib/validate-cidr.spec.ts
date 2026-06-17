/* eslint-disable sonarjs/no-hardcoded-ip -- test fixtures require hardcoded IPs */
import { describe, it, expect } from 'vitest';
import { isValidCidrOrIp } from './validate-cidr';

describe('isValidCidrOrIp', () => {
  describe('valid IPv4 CIDR', () => {
    it('should accept a standard IPv4 CIDR', () => {
      expect(isValidCidrOrIp('192.168.1.0/24')).toBe(true);
    });

    it('should accept a single-host /32 CIDR', () => {
      expect(isValidCidrOrIp('10.0.0.1/32')).toBe(true);
    });

    it('should accept a broad /8 CIDR', () => {
      expect(isValidCidrOrIp('10.0.0.0/8')).toBe(true);
    });

    it('should accept /0 CIDR', () => {
      expect(isValidCidrOrIp('0.0.0.0/0')).toBe(true);
    });
  });

  describe('valid IPv6 CIDR', () => {
    it('should accept a standard IPv6 CIDR', () => {
      expect(isValidCidrOrIp('2001:db8::/32')).toBe(true);
    });

    it('should accept a /128 prefix', () => {
      expect(isValidCidrOrIp('2001:db8::1/128')).toBe(true);
    });

    it('should accept a full IPv6 address with CIDR', () => {
      expect(
        isValidCidrOrIp('2001:0db8:0000:0000:0000:0000:0000:0001/64'),
      ).toBe(true);
    });

    it('should accept /0 prefix', () => {
      expect(isValidCidrOrIp('::/0')).toBe(true);
    });
  });

  describe('single IPv4 address', () => {
    it('should accept a single IPv4 address', () => {
      expect(isValidCidrOrIp('192.168.1.1')).toBe(true);
    });

    it('should accept 0.0.0.0', () => {
      expect(isValidCidrOrIp('0.0.0.0')).toBe(true);
    });

    it('should accept 255.255.255.255', () => {
      expect(isValidCidrOrIp('255.255.255.255')).toBe(true);
    });
  });

  describe('single IPv6 address', () => {
    it('should accept ::1 (loopback)', () => {
      expect(isValidCidrOrIp('::1')).toBe(true);
    });

    it('should accept :: (all zeros)', () => {
      expect(isValidCidrOrIp('::')).toBe(true);
    });

    it('should accept a full IPv6 address', () => {
      expect(isValidCidrOrIp('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(
        true,
      );
    });

    it('should accept a compressed IPv6 address', () => {
      expect(isValidCidrOrIp('fe80::1')).toBe(true);
    });
  });

  describe('invalid CIDRs', () => {
    it('should reject an IPv4 octet > 255', () => {
      expect(isValidCidrOrIp('999.999.999.999/24')).toBe(false);
    });

    it('should reject a negative prefix', () => {
      expect(isValidCidrOrIp('192.168.1.0/-1')).toBe(false);
    });

    it('should reject an IPv4 prefix > 32', () => {
      expect(isValidCidrOrIp('192.168.1.0/33')).toBe(false);
    });

    it('should reject an IPv6 prefix > 128', () => {
      expect(isValidCidrOrIp('2001:db8::/129')).toBe(false);
    });

    it('should reject a non-numeric prefix', () => {
      expect(isValidCidrOrIp('192.168.1.0/abc')).toBe(false);
    });

    it('should reject a floating-point prefix', () => {
      expect(isValidCidrOrIp('192.168.1.0/24.5')).toBe(false);
    });
  });

  describe('malformed input', () => {
    it('should reject an empty string', () => {
      expect(isValidCidrOrIp('')).toBe(false);
    });

    it('should reject multiple slashes', () => {
      expect(isValidCidrOrIp('192.168.1.0/24/16')).toBe(false);
    });

    it('should reject trailing slash without prefix', () => {
      expect(isValidCidrOrIp('192.168.1.0/')).toBe(false);
    });

    it('should reject IPv6 trailing slash without prefix', () => {
      expect(isValidCidrOrIp('2001:db8::/')).toBe(false);
    });

    it('should reject whitespace-only prefix', () => {
      expect(isValidCidrOrIp('10.0.0.1/ ')).toBe(false);
    });

    it('should reject prefix with leading whitespace', () => {
      expect(isValidCidrOrIp('10.0.0.1/ 24')).toBe(false);
    });

    it('should reject prefix with trailing whitespace', () => {
      expect(isValidCidrOrIp('10.0.0.1/24 ')).toBe(false);
    });

    it('should reject tab character in prefix', () => {
      expect(isValidCidrOrIp('10.0.0.1/\t8')).toBe(false);
    });

    it('should reject random text', () => {
      expect(isValidCidrOrIp('not-an-ip')).toBe(false);
    });
  });

  describe('IPv6 edge cases', () => {
    it('should reject structurally invalid IPv6 with too many colons', () => {
      expect(isValidCidrOrIp(':::::::::/64')).toBe(false);
    });

    it('should reject IPv6 with multiple :: groups', () => {
      expect(isValidCidrOrIp('2001::db8::1/64')).toBe(false);
    });

    it('should reject IPv6 with too many groups', () => {
      expect(isValidCidrOrIp('1:2:3:4:5:6:7:8:9/64')).toBe(false);
    });

    it('should reject IPv6 group with invalid hex', () => {
      expect(isValidCidrOrIp('gggg::/32')).toBe(false);
    });

    it('should reject IPv6 group with more than 4 hex digits', () => {
      expect(isValidCidrOrIp('12345::/32')).toBe(false);
    });

    it('should reject single IPv6 with multiple :: groups', () => {
      expect(isValidCidrOrIp('2001::db8::1')).toBe(false);
    });
  });
});
