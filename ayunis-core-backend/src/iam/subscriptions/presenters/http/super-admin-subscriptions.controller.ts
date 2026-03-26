import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Logger,
  Put,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from '../../../authentication/application/decorators/current-user.decorator';
import { GetLatestSubscriptionUseCase } from '../../application/use-cases/get-latest-subscription/get-latest-subscription.use-case';
import { GetLatestSubscriptionQuery } from '../../application/use-cases/get-latest-subscription/get-latest-subscription.query';
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

import { UpdateSeatsCommand } from '../../application/use-cases/update-seats/update-seats.command';
import { UpdateSeatsDto } from './dto/update-seats.dto';
import { UpdateSeatsUseCase } from '../../application/use-cases/update-seats/update-seats.use-case';
import { UpdateBillingInfoDto } from './dto/update-billing-info.dto';
import { UpdateBillingInfoUseCase } from '../../application/use-cases/update-billing-info/update-billing-info.use-case';
import { UpdateBillingInfoCommand } from '../../application/use-cases/update-billing-info/update-billing-info.command';
import { UpdateStartDateUseCase } from '../../application/use-cases/update-start-date/update-start-date.use-case';
import { UpdateStartDateCommand } from '../../application/use-cases/update-start-date/update-start-date.command';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SubscriptionNotFoundError } from '../../application/subscription.errors';
import { UpdateStartDateDto } from './dto/update-start-date.dto';

@ApiTags('Super Admin Subscriptions')
@Controller('super-admin/subscriptions')
@SystemRoles(SystemRole.SUPER_ADMIN)
@ApiExtraModels(
  SubscriptionResponseDto,
  SubscriptionResponseDtoNullable,
  CreateSubscriptionRequestDto,
  ActiveSubscriptionResponseDto,
  UpdateBillingInfoDto,
  UpdateStartDateDto,
)
export class SuperAdminSubscriptionsController {
  private readonly logger = new Logger(SuperAdminSubscriptionsController.name);

  constructor(
    private readonly getLatestSubscriptionUseCase: GetLatestSubscriptionUseCase,
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly uncancelSubscriptionUseCase: UncancelSubscriptionUseCase,
    private readonly subscriptionResponseMapper: SubscriptionResponseMapper,
    private readonly updateSeatsUseCase: UpdateSeatsUseCase,
    private readonly updateBillingInfoUseCase: UpdateBillingInfoUseCase,
    private readonly updateStartDateUseCase: UpdateStartDateUseCase,
  ) {}

  @Get(':orgId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get subscription details for a specific organization',
    description:
      'Retrieve subscription details for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to get subscription for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved subscription details',
    schema: {
      $ref: getSchemaPath(SubscriptionResponseDtoNullable),
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getSubscription(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<SubscriptionResponseDtoNullable> {
    this.logger.log(
      `Getting subscription for org ${orgId} by super admin ${userId}`,
    );

    try {
      const query = new GetLatestSubscriptionQuery({
        orgId,
        requestingUserId: userId,
      });

      const result = await this.getLatestSubscriptionUseCase.execute(query);

      const responseDto = this.subscriptionResponseMapper.toDto(result);
      this.logger.log(`Successfully retrieved subscription for org ${orgId}`);

      return { subscription: responseDto };
    } catch (error) {
      if (error instanceof SubscriptionNotFoundError) {
        this.logger.warn(`No subscription found for org ${orgId}`);
        return { subscription: undefined };
      }
      throw error;
    }
  }

  @Post(':orgId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new subscription for a specific organization',
    description:
      'Create a new subscription for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to create subscription for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully created subscription',
    schema: {
      $ref: getSchemaPath(SubscriptionResponseDto),
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid subscription data provided',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Subscription already exists for this organization',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async createSubscription(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() createSubscriptionDto: CreateSubscriptionRequestDto,
  ): Promise<void> {
    this.logger.log(
      `Creating subscription for org ${orgId} by super admin ${userId}`,
    );

    const command = new CreateSubscriptionCommand({
      orgId,
      requestingUserId: userId,
      type: createSubscriptionDto.type,
      noOfSeats: createSubscriptionDto.noOfSeats,
      monthlyCredits: createSubscriptionDto.monthlyCredits,
      companyName: createSubscriptionDto.companyName,
      subText: createSubscriptionDto.subText,
      street: createSubscriptionDto.street,
      houseNumber: createSubscriptionDto.houseNumber,
      postalCode: createSubscriptionDto.postalCode,
      city: createSubscriptionDto.city,
      country: createSubscriptionDto.country,
      vatNumber: createSubscriptionDto.vatNumber,
      startsAt: createSubscriptionDto.startsAt
        ? new Date(createSubscriptionDto.startsAt)
        : undefined,
    });

    await this.createSubscriptionUseCase.execute(command);
    this.logger.log(`Successfully created subscription for org ${orgId}`);
  }

  @Put(':orgId/seats')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Update the number of seats for a specific organization',
    description:
      'Update the number of seats for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to update seats for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully updated seats',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid seat update data provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No subscription found for the organization',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async updateSeats(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() updateSeatsDto: UpdateSeatsDto,
  ): Promise<void> {
    this.logger.log(`Updating seats for org ${orgId} by super admin ${userId}`);
    const command = new UpdateSeatsCommand({
      orgId,
      requestingUserId: userId,
      noOfSeats: updateSeatsDto.noOfSeats,
    });
    await this.updateSeatsUseCase.execute(command);
    this.logger.log(`Successfully updated seats for org ${orgId}`);
  }

  @Put(':orgId/billing-info')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Update the billing information for a specific organization',
    description:
      'Update the billing information for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to update billing info for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully updated billing information',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid billing information provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No subscription found for the organization',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async updateBillingInfo(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() updateBillingInfoDto: UpdateBillingInfoDto,
  ): Promise<void> {
    this.logger.log(
      `Updating billing info for org ${orgId} by super admin ${userId}`,
    );
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

  @Put(':orgId/start-date')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Update the start date for a specific organization subscription',
    description:
      'Update the start date for the latest subscription of the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to update the subscription start date for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully updated subscription start date',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid start date provided',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No subscription found for the organization',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async updateStartDate(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Body() updateStartDateDto: UpdateStartDateDto,
  ): Promise<void> {
    this.logger.log(
      `Updating subscription start date for org ${orgId} by super admin ${userId}`,
    );

    const command = new UpdateStartDateCommand({
      orgId,
      requestingUserId: userId,
      startsAt: new Date(updateStartDateDto.startsAt),
    });

    await this.updateStartDateUseCase.execute(command);
    this.logger.log(
      `Successfully updated subscription start date for org ${orgId}`,
    );
  }

  @Delete(':orgId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel the subscription for a specific organization',
    description:
      'Cancel the subscription for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to cancel subscription for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully cancelled subscription',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No subscription found for the organization',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Subscription is already cancelled',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async cancelSubscription(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<void> {
    this.logger.log(
      `Cancelling subscription for org ${orgId} by super admin ${userId}`,
    );

    const command = new CancelSubscriptionCommand({
      orgId,
      requestingUserId: userId,
    });
    await this.cancelSubscriptionUseCase.execute(command);
    this.logger.log(`Successfully cancelled subscription for org ${orgId}`);
  }

  @Post(':orgId/uncancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Uncancel the subscription for a specific organization',
    description:
      'Uncancel the subscription for the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to uncancel subscription for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully uncancelled subscription',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No subscription found for the organization',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Subscription is not cancelled',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async uncancelSubscription(
    @Param('orgId') orgId: UUID,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<void> {
    this.logger.log(
      `Uncancelling subscription for org ${orgId} by super admin ${userId}`,
    );

    const command = new UncancelSubscriptionCommand({
      orgId,
      requestingUserId: userId,
    });

    await this.uncancelSubscriptionUseCase.execute(command);
    this.logger.log(`Successfully uncancelled subscription for org ${orgId}`);
  }
}
