import { BlockList, isIP } from 'net';

interface ParsedCidr {
  address: string;
  prefix: number;
  type: 'ipv4' | 'ipv6';
}

/**
 * Parses a CIDR string into its components, returning null for invalid input.
 * Accepts both full CIDRs (e.g., "192.168.1.0/24") and single IPs
 * (e.g., "10.0.0.1" is treated as /32 for IPv4 or /128 for IPv6).
 */
export function parseCidr(cidr: string): ParsedCidr | null {
  const parts = cidr.split('/');

  if (parts.length > 2) {
    return null;
  }

  const address = parts[0];
  const ipVersion = isIP(address);

  if (ipVersion === 0) {
    return null;
  }

  const type = ipVersion === 4 ? 'ipv4' : 'ipv6';
  const maxPrefix = ipVersion === 4 ? 32 : 128;

  if (parts.length === 1) {
    return { address, prefix: maxPrefix, type };
  }

  const prefixStr = parts[1];

  if (!/^\d+$/.test(prefixStr)) {
    return null;
  }

  const prefix = Number(prefixStr);

  if (prefix > maxPrefix) {
    return null;
  }

  return { address, prefix, type };
}

/**
 * Validates whether a string is a valid CIDR notation (IPv4 or IPv6).
 * Accepts both full CIDRs (e.g., "192.168.1.0/24") and single IPs
 * (e.g., "10.0.0.1" is treated as /32 for IPv4 or /128 for IPv6).
 */
export function isValidCidr(cidr: string): boolean {
  return parseCidr(cidr) !== null;
}

/** Adds a single CIDR entry to a BlockList, skipping malformed entries. */
function addCidrToBlockList(blockList: BlockList, cidr: string): void {
  const parsed = parseCidr(cidr);

  if (!parsed) {
    return;
  }

  const { address, prefix, type } = parsed;
  const maxPrefix = type === 'ipv4' ? 32 : 128;

  if (prefix === maxPrefix && !cidr.includes('/')) {
    blockList.addAddress(address, type);
  } else {
    blockList.addSubnet(address, prefix, type);
  }
}

const IPV4_MAPPED_IPV6_PREFIX = '::ffff:';

/**
 * Strips the `::ffff:` prefix from IPv4-mapped IPv6 addresses.
 * Node.js `request.socket.remoteAddress` commonly returns IPs in this format
 * (e.g., `::ffff:192.168.1.50` for an IPv4 connection).
 */
function normalizeIp(ip: string): string {
  const lower = ip.toLowerCase();
  if (lower.startsWith(IPV4_MAPPED_IPV6_PREFIX)) {
    const candidate = ip.slice(IPV4_MAPPED_IPV6_PREFIX.length);
    if (isIP(candidate) === 4) {
      return candidate;
    }
  }
  return ip;
}

/**
 * Checks whether an IP address falls within any of the provided CIDR ranges.
 * Returns true if the IP matches at least one CIDR, false otherwise.
 *
 * Handles IPv4-mapped IPv6 addresses (e.g., `::ffff:192.168.1.50`) by
 * stripping the prefix before matching against IPv4 CIDRs.
 */
export function isIpInCidrs(ip: string, cidrs: string[]): boolean {
  if (cidrs.length === 0) {
    return false;
  }

  const blockList = new BlockList();

  for (const cidr of cidrs) {
    addCidrToBlockList(blockList, cidr);
  }

  const normalized = normalizeIp(ip);
  const ipVersion = isIP(normalized);
  if (ipVersion === 0) {
    return false;
  }

  return blockList.check(normalized, ipVersion === 4 ? 'ipv4' : 'ipv6');
}
