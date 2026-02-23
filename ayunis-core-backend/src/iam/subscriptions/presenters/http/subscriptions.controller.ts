import { Controller, Get, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CurrentUser,
  UserProperty,
} from '../../../authentication/application/decorators/current-user.decorator';
import { ActiveSubscriptionResponseDto } from './dto/active-subscription-response.dto';
import { HasActiveSubscriptionUseCase } from '../../application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from '../../application/use-cases/has-active-subscription/has-active-subscription.query';
import { GetCurrentPriceUseCase } from '../../application/use-cases/get-current-price/get-current-price.use-case';
import { PriceResponseDto } from './dto/price-response.dto';
import { UUID } from 'crypto';

@ApiTags('subscriptions')
@Controller('subscriptions')
@ApiExtraModels(ActiveSubscriptionResponseDto, PriceResponseDto)
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
    private readonly getCurrentPriceUseCase: GetCurrentPriceUseCase,
  ) {}

  @Get('active')
  @ApiOperation({
    summary: 'Check if the current organization has an active subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully checked subscription status',
    schema: {
      $ref: getSchemaPath(ActiveSubscriptionResponseDto),
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async hasActiveSubscription(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<ActiveSubscriptionResponseDto> {
    this.logger.log(`Checking active subscription for org ${orgId}`);

    const query = new HasActiveSubscriptionQuery(orgId);
    const hasActiveSubscription =
      await this.hasActiveSubscriptionUseCase.execute(query);

    this.logger.log(
      `Active subscription check result for org ${orgId}: ${hasActiveSubscription}`,
    );

    return { hasActiveSubscription };
  }

  @Get('price')
  @ApiOperation({
    summary: 'Get the current price per seat monthly',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved current price',
    schema: {
      $ref: getSchemaPath(PriceResponseDto),
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Price not configured',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  getCurrentPrice(): PriceResponseDto {
    this.logger.log('Getting current price per seat monthly');

    const pricePerSeatMonthly = this.getCurrentPriceUseCase.execute();

    this.logger.log(
      `Successfully retrieved current price: ${pricePerSeatMonthly}`,
    );

    return { pricePerSeatMonthly };
  }
}
