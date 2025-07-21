import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriceNotFoundError } from '../../subscription.errors';

@Injectable()
export class GetCurrentPriceUseCase {
  private readonly logger = new Logger(GetCurrentPriceUseCase.name);
  constructor(private readonly configService: ConfigService) {}

  execute(): number {
    const pricePerSeatMonthly = this.configService.get<number>(
      'subscriptions.pricePerSeatMonthly',
    );

    if (!pricePerSeatMonthly) {
      this.logger.error('Price not found');
      throw new PriceNotFoundError();
    }

    return pricePerSeatMonthly;
  }
}
