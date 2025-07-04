import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
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
import { GetSubscriptionUseCase } from '../../application/use-cases/get-subscription/get-subscription.use-case';
import { GetSubscriptionQuery } from '../../application/use-cases/get-subscription/get-subscription.query';
import { CreateSubscriptionUseCase } from '../../application/use-cases/create-subscription/create-subscription.use-case';
import { CreateSubscriptionCommand } from '../../application/use-cases/create-subscription/create-subscription.command';
import { CancelSubscriptionUseCase } from '../../application/use-cases/cancel-subscription/cancel-subscription.use-case';
import { CancelSubscriptionCommand } from '../../application/use-cases/cancel-subscription/cancel-subscription.command';
import { UncancelSubscriptionUseCase } from '../../application/use-cases/uncancel-subscription/uncancel-subscription.use-case';
import { UncancelSubscriptionCommand } from '../../application/use-cases/uncancel-subscription/uncancel-subscription.command';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { CreateSubscriptionRequestDto } from './dto/create-subscription-request.dto';
import { ActiveSubscriptionResponseDto } from './dto/active-subscription-response.dto';
import { SubscriptionResponseMapper } from './mappers/subscription-response.mapper';
import { HasActiveSubscriptionUseCase } from '../../application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from '../../application/use-cases/has-active-subscription/has-active-subscription.query';
import {
  UnauthorizedSubscriptionAccessError,
  SubscriptionAlreadyExistsError,
  SubscriptionNotFoundError,
  SubscriptionAlreadyCancelledError,
  SubscriptionNotCancelledError,
  InvalidSubscriptionDataError,
} from '../../application/subscription.errors';

@ApiTags('subscriptions')
@Controller('subscriptions')
@ApiExtraModels(
  SubscriptionResponseDto,
  CreateSubscriptionRequestDto,
  ActiveSubscriptionResponseDto,
)
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly getSubscriptionUseCase: GetSubscriptionUseCase,
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly uncancelSubscriptionUseCase: UncancelSubscriptionUseCase,
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
    private readonly subscriptionResponseMapper: SubscriptionResponseMapper,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get subscription details for the current organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved subscription details',
    schema: {
      $ref: getSchemaPath(SubscriptionResponseDto),
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
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Getting subscription for org ${orgId} by user ${userId}`);

    const query = new GetSubscriptionQuery({
      orgId,
      requestingUserId: userId,
    });

    const result = await this.getSubscriptionUseCase.execute(query);

    if (!result) {
      this.logger.warn(
        `No subscription found for org ${orgId} or user ${userId} is not authorized`,
      );
      throw new NotFoundException('Subscription not found or access denied');
    }

    const responseDto = this.subscriptionResponseMapper.toDto(result);
    this.logger.log(`Successfully retrieved subscription for org ${orgId}`);

    return responseDto;
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
      renewalCycle: createSubscriptionDto.renewalCycle,
    });

    try {
      await this.createSubscriptionUseCase.execute(command);
      this.logger.log(`Successfully created subscription for org ${orgId}`);
    } catch (error) {
      if (error instanceof UnauthorizedSubscriptionAccessError) {
        throw new ForbiddenException(
          'Not authorized to create subscription for this organization',
        );
      }
      if (error instanceof SubscriptionAlreadyExistsError) {
        throw new ConflictException(
          'Subscription already exists for this organization',
        );
      }
      if (error instanceof InvalidSubscriptionDataError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

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

    try {
      await this.cancelSubscriptionUseCase.execute(command);
      this.logger.log(`Successfully cancelled subscription for org ${orgId}`);
    } catch (error) {
      if (error instanceof UnauthorizedSubscriptionAccessError) {
        throw new ForbiddenException(
          'Not authorized to cancel subscription for this organization',
        );
      }
      if (error instanceof SubscriptionNotFoundError) {
        throw new NotFoundException(
          'Subscription not found for this organization',
        );
      }
      if (error instanceof SubscriptionAlreadyCancelledError) {
        throw new ConflictException('Subscription is already cancelled');
      }
      throw error;
    }
  }

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

    try {
      await this.uncancelSubscriptionUseCase.execute(command);
      this.logger.log(`Successfully uncancelled subscription for org ${orgId}`);
    } catch (error) {
      if (error instanceof UnauthorizedSubscriptionAccessError) {
        throw new ForbiddenException(
          'Not authorized to uncancel subscription for this organization',
        );
      }
      if (error instanceof SubscriptionNotFoundError) {
        throw new NotFoundException(
          'Subscription not found for this organization',
        );
      }
      if (error instanceof SubscriptionNotCancelledError) {
        throw new ConflictException('Subscription is not cancelled');
      }
      throw error;
    }
  }
}
