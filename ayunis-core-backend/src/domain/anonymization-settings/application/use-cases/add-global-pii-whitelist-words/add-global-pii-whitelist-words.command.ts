import type { UUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export class AddGlobalPiiWhitelistWordsCommand {
  constructor(
    public readonly category: PiiCategory,
    public readonly words: string[],
    public readonly createdByUserId: UUID,
  ) {}
}
