import type { UUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export class ValidatePiiWhitelistExceptionQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly category: PiiCategory,
    /** The original (unmasked) value that should no longer be masked. */
    public readonly word: string,
  ) {}
}
