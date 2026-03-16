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

const IPV6_HEX_GROUP = /^[0-9a-fA-F]{1,4}$/;

function areValidIpv6Groups(groups: string[]): boolean {
  return groups.every((group) => IPV6_HEX_GROUP.test(group));
}

function isValidCompressedIpv6(address: string): boolean {
  const parts = address.split('::');
  const left = parts[0] ? parts[0].split(':').filter((g) => g !== '') : [];
  const right = parts[1] ? parts[1].split(':').filter((g) => g !== '') : [];

  if (left.length + right.length >= 8) return false;
  return areValidIpv6Groups([...left, ...right]);
}

function isValidFullIpv6(address: string): boolean {
  const groups = address.split(':');
  if (groups.length !== 8) return false;
  return areValidIpv6Groups(groups);
}

function isValidIpv6Address(address: string): boolean {
  if (!address) return false;
  if (!/^[0-9a-fA-F:]+$/.test(address)) return false;
  if (address.includes(':::')) return false;

  const doubleColonCount = (address.match(/::/g) ?? []).length;
  if (doubleColonCount > 1) return false;

  return doubleColonCount === 1
    ? isValidCompressedIpv6(address)
    : isValidFullIpv6(address);
}

function isValidIpv6Cidr(cidr: string): boolean {
  const parts = cidr.split('/');
  if (parts.length !== 2) return false;

  const prefixStr = parts[1];
  if (!/^\d{1,3}$/.test(prefixStr)) return false;
  const prefix = Number(prefixStr);
  if (prefix < 0 || prefix > 128) return false;

  return isValidIpv6Address(parts[0]);
}

function isValidSingleIpv4(ip: string): boolean {
  const match = SINGLE_IPV4_REGEX.exec(ip);
  if (!match) return false;
  const octets = [match[1], match[2], match[3], match[4]];
  return !octets.some((o) => Number(o) > 255);
}

function isValidSingleIpv6(ip: string): boolean {
  return isValidIpv6Address(ip);
}

/**
 * Validates a CIDR string (IPv4 or IPv6).
 * Also accepts single IP addresses (treated as /32 for IPv4 or /128 for IPv6 by the backend).
 */
export function isValidCidr(cidr: string): boolean {
  return (
    isValidIpv4Cidr(cidr) ||
    isValidIpv6Cidr(cidr) ||
    isValidSingleIpv4(cidr) ||
    isValidSingleIpv6(cidr)
  );
}
