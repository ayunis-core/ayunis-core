import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Patch,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { ApiUsersListQueries } from './decorators/api-users-list.decorator';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { DeleteUserUseCase } from 'src/iam/users/application/use-cases/delete-user/delete-user.use-case';
import { SuperAdminTriggerPasswordResetUseCase } from 'src/iam/users/application/use-cases/super-admin-trigger-password-reset/super-admin-trigger-password-reset.use-case';
import { SuperAdminTriggerPasswordResetCommand } from 'src/iam/users/application/use-cases/super-admin-trigger-password-reset/super-admin-trigger-password-reset.command';
import { TriggerSetInitialPasswordUseCase } from 'src/iam/users/application/use-cases/trigger-set-initial-password/trigger-set-initial-password.use-case';
import { TriggerSetInitialPasswordCommand } from 'src/iam/users/application/use-cases/trigger-set-initial-password/trigger-set-initial-password.command';
import { CreateUserUseCase } from 'src/iam/users/application/use-cases/create-user/create-user.use-case';
import { CreateUserCommand } from 'src/iam/users/application/use-cases/create-user/create-user.command';
import { UserResponseDtoMapper } from './mappers/user-response-dto.mapper';
import {
  UserResponseDto,
  PaginatedUsersListResponseDto,
} from './dtos/user-response.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { TriggerPasswordResetResponseDto } from './dtos/trigger-password-reset-response.dto';
import { GetUsersQueryParamsDto } from './dtos/get-users-query-params.dto';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { DeleteUserCommand } from 'src/iam/users/application/use-cases/delete-user/delete-user.command';
import { UnlockUserAccountCommand } from 'src/iam/users/application/use-cases/unlock-user-account/unlock-user-account.command';
import { UnlockUserAccountUseCase } from 'src/iam/users/application/use-cases/unlock-user-account/unlock-user-account.use-case';
import { UUID } from 'crypto';
import { randomBytes } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@ApiTags('Super Admin Users')
@Controller('super-admin/users')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminUsersController {
  private readonly logger = new Logger(SuperAdminUsersController.name);

  // eslint-disable-next-line max-params -- NestJS injects these explicit collaborators.
  constructor(
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly triggerSetInitialPasswordUseCase: TriggerSetInitialPasswordUseCase,
    private readonly superAdminTriggerPasswordResetUseCase: SuperAdminTriggerPasswordResetUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly userResponseDtoMapper: UserResponseDtoMapper,
    private readonly unlockUserAccountUseCase: UnlockUserAccountUseCase,
  ) {}

  @Get(':orgId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get users by organization ID',
    description:
      'Retrieve paginated users that belong to the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to get users for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiUsersListQueries()
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  async getUsersByOrgId(
    @Param('orgId') orgId: UUID,
    @Query() queryParams: GetUsersQueryParamsDto,
  ): Promise<PaginatedUsersListResponseDto> {
    this.logger.log(
      {
        orgId,
        limit: queryParams.limit,
        offset: queryParams.offset,
        hasSearch: queryParams.search !== undefined,
      },
      'getUsersByOrgId',
    );

    const users = await this.findUsersByOrgIdUseCase.execute(
      new FindUsersByOrgIdQuery({
        orgId,
        search: queryParams.search,
        pagination: {
          limit: queryParams.limit,
          offset: queryParams.offset,
        },
      }),
    );
    return this.userResponseDtoMapper.toPaginatedDto(users, true);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Delete a user by their ID. This endpoint is only accessible to super admins and allows deletion of users from any organization.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to delete',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User successfully deleted',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while deleting user',
  })
  async deleteUser(@Param('userId') userId: UUID): Promise<void> {
    this.logger.log({ userId }, 'deleteUser');

    // Get the user to retrieve their orgId for the delete command
    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(userId),
    );

    await this.deleteUserUseCase.execute(
      new DeleteUserCommand({
        userId,
        orgId: user.orgId,
      }),
    );
  }

  @Patch(':userId/unlock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlock a user in any organization' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'User account unlocked' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Requester is not authenticated' })
  @ApiForbiddenResponse({ description: 'Requester is not a super admin' })
  async unlockUser(
    @Param('userId', ParseUUIDPipe) userId: UUID,
  ): Promise<void> {
    await this.unlockUserAccountUseCase.execute(
      new UnlockUserAccountCommand(userId),
    );
  }

  @Post(':userId/trigger-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger password reset for a user',
    description:
      'Send a password reset email to the specified user and return the reset URL. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to send password reset email to',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent successfully',
    type: TriggerPasswordResetResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description:
      'Internal server error occurred while sending password reset email',
  })
  async triggerPasswordReset(
    @Param('userId') userId: UUID,
  ): Promise<TriggerPasswordResetResponseDto> {
    this.logger.log({ userId }, 'triggerPasswordReset');

    const result = await this.superAdminTriggerPasswordResetUseCase.execute(
      new SuperAdminTriggerPasswordResetCommand(userId),
    );

    return new TriggerPasswordResetResponseDto(result.resetUrl);
  }

  @Post(':orgId/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user in an organization',
    description:
      'Create a new user in the specified organization with a randomly generated password. A password reset email will be sent to the user. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to create the user in',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User information',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format or validation errors',
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while creating user',
  })
  async createUser(
    @Param('orgId') orgId: UUID,
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.createOrganizationUser(orgId, createUserDto);
  }

  private async createOrganizationUser(
    orgId: UUID,
    createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log({ orgId, email: createUserDto.email }, 'createUser');
    const randomPassword = randomBytes(32).toString('base64');
    const user = await this.createUserUseCase.execute(
      new CreateUserCommand({
        email: createUserDto.email,
        password: randomPassword,
        orgId,
        name: createUserDto.name,
        role: createUserDto.role,
        emailVerified: true,
        hasAcceptedMarketing: false,
      }),
    );

    if (createUserDto.sendActivationEmail) {
      await this.triggerSetInitialPasswordUseCase.execute(
        new TriggerSetInitialPasswordCommand(user.email, orgId),
      );
    }

    return this.userResponseDtoMapper.toDto(user, true);
  }
}
