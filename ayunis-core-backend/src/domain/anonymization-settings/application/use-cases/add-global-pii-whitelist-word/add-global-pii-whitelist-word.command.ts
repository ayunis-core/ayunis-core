import type { UUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export class AddGlobalPiiWhitelistWordCommand {
  constructor(
    public readonly category: PiiCategory,
    public readonly word: string,
    public readonly createdByUserId: UUID,
  ) {}
}
