import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { QuotaType } from '../../domain/quota-type.enum';

export interface QuotaLimitConfig {
  limit: number;
  windowMs: number;
}

@Injectable()
export class QuotaLimitResolverService {
  resolve(_userId: UUID, quotaType: QuotaType): QuotaLimitConfig {
    switch (quotaType) {
      case QuotaType.FAIR_USE_MESSAGES:
        return { limit: 200, windowMs: 3 * 60 * 60 * 1000 }; // 3 hours
      default:
        return { limit: 100, windowMs: 60 * 60 * 1000 }; // 1 hour
    }
  }
}
