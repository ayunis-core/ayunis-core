import { Controller, Get } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
} from 'src/iam/authentication/application/decorators/current-user.decorator';
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
  constructor(
    @InjectPinoLogger(SubscriptionsController.name)
    private readonly logger: PinoLogger,
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
    this.logger.info({ orgId }, 'Checking active subscription');

    const query = new HasActiveSubscriptionQuery(orgId);
    const result = await this.hasActiveSubscriptionUseCase.execute(query);

    this.logger.info(
      { orgId, hasActiveSubscription: result.hasActiveSubscription },
      'Active subscription check completed',
    );

    return {
      hasActiveSubscription: result.hasActiveSubscription,
      subscriptionType: result.subscriptionType,
    };
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
    this.logger.info('Getting current price per seat monthly');

    const pricePerSeatMonthly = this.getCurrentPriceUseCase.execute();

    this.logger.info(
      { pricePerSeatMonthly },
      'Successfully retrieved current price',
    );

    return { pricePerSeatMonthly };
  }
}
