const IPV4_CIDR_REGEX =
  /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
const SINGLE_IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isValidIpv4Cidr(cidr: string): boolean {
  const match = IPV4_CIDR_REGEX.exec(cidr);
  if (!match) return false;
  const octets = [match[1], match[2], match[3], match[4]];
  if (octets.some((o) => Number(o) > 255)) return false;
  const prefix = Number(match[5]);
  return prefix >= 0 && prefix <= 32;
}

function isValidSingleIpv4(ip: string): boolean {
  const match = SINGLE_IPV4_REGEX.exec(ip);
  if (!match) return false;
  const octets = [match[1], match[2], match[3], match[4]];
  return !octets.some((o) => Number(o) > 255);
}

/**
 * Validates an IPv6 address string (without prefix).
 * Handles full form, compressed (::), and mixed formats.
 */
function isValidIpv6Address(address: string): boolean {
  if (address.length === 0) return false;

  // Check for multiple consecutive :: (only one allowed)
  const doubleColonCount = address.split('::').length - 1;
  if (doubleColonCount > 1) return false;

  const groups = address.split(':');
  const hasDoubleColon = doubleColonCount === 1;

  if (hasDoubleColon) {
    // With ::, we can have fewer than 8 groups
    // Split on :: to get left and right parts
    const parts = address.split('::');
    const left = parts[0] === '' ? [] : parts[0].split(':');
    const right = parts[1] === '' ? [] : parts[1].split(':');
    const totalGroups = left.length + right.length;
    if (totalGroups > 7) return false;
    const allGroups = [...left, ...right];
    return allGroups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g));
  }

  // Without ::, must have exactly 8 groups
  if (groups.length !== 8) return false;
  return groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g));
}

function isValidIpv6Cidr(cidr: string): boolean {
  const slashIndex = cidr.lastIndexOf('/');
  if (slashIndex === -1) return false;

  const address = cidr.substring(0, slashIndex);
  const prefixStr = cidr.substring(slashIndex + 1);

  if (!/^\d{1,3}$/.test(prefixStr)) return false;
  const prefix = Number(prefixStr);
  if (prefix < 0 || prefix > 128) return false;

  return isValidIpv6Address(address);
}

function isValidSingleIpv6(ip: string): boolean {
  // Must not contain a slash (that would be CIDR notation)
  if (ip.includes('/')) return false;
  return isValidIpv6Address(ip);
}

/**
 * Validates a CIDR string (IPv4 or IPv6).
 * Also accepts single IPv4/IPv6 addresses (treated as /32 or /128 by the backend).
 */
export function isValidCidrOrIp(cidr: string): boolean {
  return (
    isValidIpv4Cidr(cidr) ||
    isValidIpv6Cidr(cidr) ||
    isValidSingleIpv4(cidr) ||
    isValidSingleIpv6(cidr)
  );
}
