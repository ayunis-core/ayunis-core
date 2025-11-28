import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Logger,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from '../../../authentication/application/decorators/current-user.decorator';
import { GetActiveSubscriptionUseCase } from '../../application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { GetActiveSubscriptionQuery } from '../../application/use-cases/get-active-subscription/get-active-subscription.query';
import { CreateSubscriptionUseCase } from '../../application/use-cases/create-subscription/create-subscription.use-case';
import { CreateSubscriptionCommand } from '../../application/use-cases/create-subscription/create-subscription.command';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription/cancel-subscription.use-case';
import { CancelSubscriptionCommand } from '../../application/use-cases/cancel-subscription/cancel-subscription.command';
import { UncancelSubscriptionUseCase } from '../../application/use-cases/uncancel-subscription/uncancel-subscription.use-case';
import { UncancelSubscriptionCommand } from '../../application/use-cases/uncancel-subscription/uncancel-subscription.command';
import {
  SubscriptionResponseDto,
  SubscriptionResponseDtoNullable,
} from './dto/subscription-response.dto';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { ActiveSubscriptionResponseDto } from './dto/active-subscription-response.dto';
import { SubscriptionResponseMapper } from './mappers/subscription-response.mapper';
import { HasActiveSubscriptionUseCase } from '../../application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from '../../application/use-cases/has-active-subscription/has-active-subscription.query';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UpdateSeatsCommand } from '../../application/use-cases/update-seats/update-seats.command';
import { UpdateSeatsDto } from './dto/update-seats.dto';
import { UpdateSeatsUseCase } from '../../application/use-cases/update-seats/update-seats.use-case';
import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';
import { UpdateBillingInfoUseCase } from '../../application/use-cases/update-billing-info/update-billing-info.use-case';
import { UpdateBillingInfoCommand } from '../../application/use-cases/update-billing-info/update-billing-info.command';
import { GetCurrentPriceUseCase } from '../../application/use-cases/get-current-price/get-current-price.use-case';
import { PriceResponseDto } from './dto/price-response.dto';
import { SubscriptionNotFoundError } from '../../application/subscription.errors';

@ApiTags('subscriptions')
@Controller('subscriptions')
@ApiExtraModels(
  SubscriptionResponseDto,
  SubscriptionResponseDtoNullable,
  CreateSubscriptionRequestDto,
  ActiveSubscriptionResponseDto,
  UpdateBillingInfoDto,
  PriceResponseDto,
)
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly getSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly uncancelSubscriptionUseCase: UncancelSubscriptionUseCase,
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
    private readonly subscriptionResponseMapper: SubscriptionResponseMapper,
    private readonly updateSeatsUseCase: UpdateSeatsUseCase,
    private readonly updateBillingInfoUseCase: UpdateBillingInfoUseCase,
    private readonly getCurrentPriceUseCase: GetCurrentPriceUseCase,
  ) {}

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({
    summary: 'Get subscription details for the current organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved subscription details',
    schema: {
      $ref: getSchemaPath(SubscriptionResponseDtoNullable),
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "User is not authorized to access this organization's subscription",
  })
  @ApiResponse({
    status: 404,
    description: 'No subscription found for the organization',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getSubscription(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<SubscriptionResponseDtoNullable> {
    this.logger.log(`Getting subscription for org ${orgId} by user ${userId}`);

    try {
      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId: userId,
      });

      const result = await this.getSubscriptionUseCase.execute(query);

      const responseDto = this.subscriptionResponseMapper.toDto(result);
      this.logger.log(`Successfully retrieved subscription for org ${orgId}`);

      return { subscription: responseDto };
    } catch (error) {
      if (error instanceof SubscriptionNotFoundError) {
        return { subscription: undefined };
      }
      throw error;
    }
  }

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

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Create a new subscription for the current organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully created subscription',
    schema: {
      $ref: getSchemaPath(SubscriptionResponseDto),
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid subscription data provided',
  })
  @ApiResponse({
    status: 403,
    description:
      'User is not authorized to create a subscription for this organization',
  })
  @ApiResponse({
    status: 409,
    description: 'Subscription already exists for this organization',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createSubscription(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() createSubscriptionDto: CreateSubscriptionRequestDto,
  ): Promise<void> {
    this.logger.log(`Creating subscription for org ${orgId} by user ${userId}`);

    const command = new CreateSubscriptionCommand({
      orgId,
      requestingUserId: userId,
      noOfSeats: createSubscriptionDto.noOfSeats,
      companyName: createSubscriptionDto.companyName,
      subText: createSubscriptionDto.subText,
      street: createSubscriptionDto.street,
      houseNumber: createSubscriptionDto.houseNumber,
      postalCode: createSubscriptionDto.postalCode,
      city: createSubscriptionDto.city,
      country: createSubscriptionDto.country,
      vatNumber: createSubscriptionDto.vatNumber,
    });

    await this.createSubscriptionUseCase.execute(command);
    this.logger.log(`Successfully created subscription for org ${orgId}`);
  }

  @Roles(UserRole.ADMIN)
  @Put('seats')
  @ApiOperation({
    summary: 'Update the number of seats for the current organization',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully updated seats',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to update seats for this organization',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid seat update data provided',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateSeats(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() updateSeatsDto: UpdateSeatsDto,
  ): Promise<void> {
    this.logger.log(`Updating seats for org ${orgId} by user ${userId}`);
    const command = new UpdateSeatsCommand({
      orgId,
      requestingUserId: userId,
      noOfSeats: updateSeatsDto.noOfSeats,
    });
    await this.updateSeatsUseCase.execute(command);
    this.logger.log(`Successfully updated seats for org ${orgId}`);
  }

  @Roles(UserRole.ADMIN)
  @Put('billing-info')
  @ApiOperation({
    summary: 'Update the billing information for the current organization',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully updated billing information',
  })
  @ApiResponse({
    status: 403,
    description:
      'User is not authorized to update billing information for this organization',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid billing information provided',
  })
  @ApiResponse({
    status: 404,
    description: 'No subscription found for the organization',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateBillingInfo(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() updateBillingInfoDto: UpdateBillingInfoDto,
  ): Promise<void> {
    this.logger.log(`Updating billing info for org ${orgId} by user ${userId}`);
    const command = new UpdateBillingInfoCommand({
      orgId,
      requestingUserId: userId,
      billingInfo: {
        companyName: updateBillingInfoDto.companyName,
        street: updateBillingInfoDto.street,
        houseNumber: updateBillingInfoDto.houseNumber,
        postalCode: updateBillingInfoDto.postalCode,
        city: updateBillingInfoDto.city,
        country: updateBillingInfoDto.country,
        vatNumber: updateBillingInfoDto.vatNumber,
      },
    });
    await this.updateBillingInfoUseCase.execute(command);
    this.logger.log(`Successfully updated billing info for org ${orgId}`);
  }

  @Roles(UserRole.ADMIN)
  @Delete()
  @ApiOperation({
    summary: 'Cancel the subscription for the current organization',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully cancelled subscription',
  })
  @ApiResponse({
    status: 403,
    description:
      "User is not authorized to cancel this organization's subscription",
  })
  @ApiResponse({
    status: 404,
    description: 'No subscription found for the organization',
  })
  @ApiResponse({
    status: 409,
    description: 'Subscription is already cancelled',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async cancelSubscription(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<void> {
    this.logger.log(
      `Cancelling subscription for org ${orgId} by user ${userId}`,
    );

    const command = new CancelSubscriptionCommand({
      orgId,
      requestingUserId: userId,
    });
    await this.cancelSubscriptionUseCase.execute(command);
    this.logger.log(`Successfully cancelled subscription for org ${orgId}`);
  }

  @Roles(UserRole.ADMIN)
  @Post('uncancel')
  @ApiOperation({
    summary: 'Uncancel the subscription for the current organization',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully uncancelled subscription',
  })
  @ApiResponse({
    status: 403,
    description:
      "User is not authorized to uncancel this organization's subscription",
  })
  @ApiResponse({
    status: 404,
    description: 'No subscription found for the organization',
  })
  @ApiResponse({
    status: 409,
    description: 'Subscription is not cancelled',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async uncancelSubscription(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<void> {
    this.logger.log(
      `Uncancelling subscription for org ${orgId} by user ${userId}`,
    );

    const command = new UncancelSubscriptionCommand({
      orgId,
      requestingUserId: userId,
    });

    await this.uncancelSubscriptionUseCase.execute(command);
    this.logger.log(`Successfully uncancelled subscription for org ${orgId}`);
  }
}
