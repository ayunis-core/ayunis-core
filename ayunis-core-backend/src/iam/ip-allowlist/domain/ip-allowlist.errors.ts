export const IP_ALLOWLIST_DOMAIN_ERROR_CODE = {
  INVALID_CIDR: 'INVALID_CIDR',
  EMPTY_CIDRS: 'EMPTY_CIDRS',
} as const;

const MAX_CIDR_DISPLAY_LENGTH = 100;

export class EmptyCidrsError extends Error {
  readonly code: string;

  constructor() {
    super('At least one CIDR range is required');
    this.name = 'EmptyCidrsError';
    this.code = IP_ALLOWLIST_DOMAIN_ERROR_CODE.EMPTY_CIDRS;
  }
}

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
