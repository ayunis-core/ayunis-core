import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { isValidCidr } from './cidr.util';
import { InvalidCidrError } from './ip-allowlist.errors';

export interface IpAllowlistParams {
  id?: UUID;
  orgId: UUID;
  cidrs: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class IpAllowlist {
  id: UUID;
  orgId: UUID;
  cidrs: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(params: IpAllowlistParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.cidrs = params.cidrs;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();

    this.validateCidrs();
  }

  private validateCidrs(): void {
    for (const cidr of this.cidrs) {
      if (!isValidCidr(cidr)) {
        throw new InvalidCidrError(cidr);
      }
    }
  }
}
