import { Injectable } from '@nestjs/common';
import { assertNever } from 'src/common/util/assert-never';
import { GetFairUseLimitsUseCase } from 'src/iam/platform-config/application/use-cases/get-fair-use-limits/get-fair-use-limits.use-case';
import { FairUseLimit } from 'src/iam/platform-config/domain/fair-use-limits';
import { QuotaType } from '../../domain/quota-type.enum';

@Injectable()
export class QuotaLimitResolverService {
  constructor(
    private readonly getFairUseLimitsUseCase: GetFairUseLimitsUseCase,
  ) {}

  async resolve(quotaType: QuotaType): Promise<FairUseLimit> {
    const limits = await this.getFairUseLimitsUseCase.execute();

    switch (quotaType) {
      case QuotaType.FAIR_USE_MESSAGES_LOW:
        return limits.low;
      case QuotaType.FAIR_USE_MESSAGES_MEDIUM:
        return limits.medium;
      case QuotaType.FAIR_USE_MESSAGES_HIGH:
        return limits.high;
      case QuotaType.FAIR_USE_IMAGES:
        return limits.images;
      default:
        // Defensive: when `QuotaType` grows a non-fair-use value, this throws
        // at the resolver instead of silently returning `undefined` and
        // crashing the destructure in `CheckQuotaUseCase`.
        return assertNever(quotaType);
    }
  }
}
