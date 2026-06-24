import type { UUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export interface UpdatePiiWhitelistEntryInput {
  category: PiiCategory;
  pattern: string | null;
}

export class UpdatePiiWhitelistCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly entries: UpdatePiiWhitelistEntryInput[],
  ) {}
}
