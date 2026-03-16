const IPV4_CIDR_REGEX =
  /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
const IPV6_CIDR_REGEX = /^[0-9a-fA-F:]+\/(\d{1,3})$/;
const SINGLE_IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isValidIpv4Cidr(cidr: string): boolean {
  const match = IPV4_CIDR_REGEX.exec(cidr);
  if (!match) return false;
  const octets = [match[1], match[2], match[3], match[4]];
  if (octets.some((o) => Number(o) > 255)) return false;
  const prefix = Number(match[5]);
  return prefix >= 0 && prefix <= 32;
}

function isValidIpv6Cidr(cidr: string): boolean {
  const match = IPV6_CIDR_REGEX.exec(cidr);
  if (!match) return false;
  const prefix = Number(match[1]);
  return prefix >= 0 && prefix <= 128;
}

function isValidSingleIpv4(ip: string): boolean {
  const match = SINGLE_IPV4_REGEX.exec(ip);
  if (!match) return false;
  const octets = [match[1], match[2], match[3], match[4]];
  return !octets.some((o) => Number(o) > 255);
}

/**
 * Validates a CIDR string (IPv4 or IPv6).
 * Also accepts single IPv4 addresses (treated as /32 by the backend).
 */
export function isValidCidr(cidr: string): boolean {
  return (
    isValidIpv4Cidr(cidr) || isValidIpv6Cidr(cidr) || isValidSingleIpv4(cidr)
  );
}
