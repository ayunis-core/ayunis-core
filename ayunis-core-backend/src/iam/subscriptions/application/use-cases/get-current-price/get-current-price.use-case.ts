import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { PriceNotFoundError } from '../../subscription.errors';

@Injectable()
export class GetCurrentPriceUseCase {
  constructor(
    @InjectPinoLogger(GetCurrentPriceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {}

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
