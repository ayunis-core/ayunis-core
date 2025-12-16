import {
  Controller,
  Get,
  Delete,
  Post,
  Logger,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { FindUsersByOrgIdUseCase } from '../../application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { FindUserByIdUseCase } from '../../application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user/delete-user.use-case';
import { TriggerPasswordResetUseCase } from '../../application/use-cases/trigger-password-reset/trigger-password-reset.use-case';
import { TriggerPasswordResetCommand } from '../../application/use-cases/trigger-password-reset/trigger-password-reset.command';
import { CreateUserUseCase } from '../../application/use-cases/create-user/create-user.use-case';
import { CreateUserCommand } from '../../application/use-cases/create-user/create-user.command';
import { UserResponseDtoMapper } from './mappers/user-response-dto.mapper';
import {
  UsersListResponseDto,
  UserResponseDto,
} from './dtos/user-response.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { GetUsersQueryParamsDto } from './dtos/get-users-query-params.dto';
import { FindUsersByOrgIdQuery } from '../../application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { FindUserByIdQuery } from '../../application/use-cases/find-user-by-id/find-user-by-id.query';
import { DeleteUserCommand } from '../../application/use-cases/delete-user/delete-user.command';
import { UUID } from 'crypto';
import { randomBytes } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@ApiTags('Super Admin Users')
@Controller('super-admin/users')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminUsersController {
  private readonly logger = new Logger(SuperAdminUsersController.name);

  constructor(
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly triggerPasswordResetUseCase: TriggerPasswordResetUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly userResponseDtoMapper: UserResponseDtoMapper,
  ) {}

  @Get(':orgId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get users by organization ID',
    description:
      'Retrieve all users that belong to the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to get users for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search users by name or email',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of users to return',
    example: 25,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of users to skip before collecting results',
    example: 0,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved users in the organization',
    type: UsersListResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while retrieving users',
  })
  async getUsersByOrgId(
    @Param('orgId') orgId: UUID,
    @Query() queryParams: GetUsersQueryParamsDto,
  ): Promise<UsersListResponseDto> {
    this.logger.log('getUsersByOrgId', { orgId, queryParams });

    const paginatedUsers = await this.findUsersByOrgIdUseCase.execute(
      new FindUsersByOrgIdQuery({
        orgId,
        search: queryParams.search,
        limit: queryParams.limit,
        offset: queryParams.offset,
      }),
    );
    return this.userResponseDtoMapper.toListDto(paginatedUsers);
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
    this.logger.log('deleteUser', { userId });

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

  @Post(':userId/trigger-password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Trigger password reset for a user',
    description:
      'Send a password reset email to the specified user. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to send password reset email to',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Password reset email sent successfully',
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
  async triggerPasswordReset(@Param('userId') userId: UUID): Promise<void> {
    this.logger.log('triggerPasswordReset', { userId });

    // Get the user to retrieve their email
    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(userId),
    );

    await this.triggerPasswordResetUseCase.execute(
      new TriggerPasswordResetCommand(user.email),
    );
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
    this.logger.log('createUser', { orgId, email: createUserDto.email });

    // Generate a secure random password (32 bytes = 256 bits, base64 encoded)
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

    // Send password reset email so user can set their own password
    if (createUserDto.sendPasswordResetEmail) {
      await this.triggerPasswordResetUseCase.execute(
        new TriggerPasswordResetCommand(user.email),
      );
    }

    return this.userResponseDtoMapper.toDto(user);
  }
}
