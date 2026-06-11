import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export interface AnonymizationWhitelistEntryParams {
  id?: UUID;
  orgId: UUID;
  category: PiiCategory;
  pattern: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Org-level rule exempting one PII category from anonymization, optionally
 * restricted to values fully matching a regex pattern.
 */
export class AnonymizationWhitelistEntry {
  id: UUID;
  orgId: UUID;
  category: PiiCategory;
  pattern: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: AnonymizationWhitelistEntryParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.category = params.category;
    this.pattern = params.pattern;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
