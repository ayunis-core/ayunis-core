export const IP_ALLOWLIST_DOMAIN_ERROR_CODE = {
  INVALID_CIDR: 'INVALID_CIDR',
} as const;

const MAX_CIDR_DISPLAY_LENGTH = 100;

export class InvalidCidrError extends Error {
  readonly code: string;

  constructor(cidr: string) {
    const truncated =
      cidr.length > MAX_CIDR_DISPLAY_LENGTH
        ? `${cidr.slice(0, MAX_CIDR_DISPLAY_LENGTH)}…`
        : cidr;

    super(`Invalid CIDR notation: "${truncated}"`);
    this.name = 'InvalidCidrError';
    this.code = IP_ALLOWLIST_DOMAIN_ERROR_CODE.INVALID_CIDR;
  }
}
