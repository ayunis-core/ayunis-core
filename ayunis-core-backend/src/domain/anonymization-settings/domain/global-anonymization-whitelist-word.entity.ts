import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export interface GlobalAnonymizationWhitelistWordParams {
  id?: UUID;
  category: PiiCategory;
  word: string;
  createdByUserId: UUID | null;
  createdByEmail?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Platform-wide word exempted from anonymization in every organization,
 * maintained by super admins. Matching is case-insensitive against the
 * whole detected value; the original casing is kept for display.
 */
export class GlobalAnonymizationWhitelistWord {
  id: UUID;
  category: PiiCategory;
  word: string;
  createdByUserId: UUID | null;
  createdByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: GlobalAnonymizationWhitelistWordParams) {
    this.id = params.id ?? randomUUID();
    this.category = params.category;
    this.word = params.word.trim();
    this.createdByUserId = params.createdByUserId;
    this.createdByEmail = params.createdByEmail ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
