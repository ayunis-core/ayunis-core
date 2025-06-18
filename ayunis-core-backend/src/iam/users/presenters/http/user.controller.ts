import {
  Controller,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../authentication/application/decorators/current-user.decorator';
import { UserProperty } from '../../../authentication/application/decorators/current-user.decorator';
import { UUID } from 'crypto';
import { FindUsersByOrgIdUseCase } from '../../application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { FindUsersByOrgIdQuery } from '../../application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user/delete-user.use-case';
import { DeleteUserCommand } from '../../application/use-cases/delete-user/delete-user.command';
import { UpdateUserRoleUseCase } from '../../application/use-cases/update-user-role/update-user-role.use-case';
import { UpdateUserRoleCommand } from '../../application/use-cases/update-user-role/update-user-role.command';
import { UpdateUserNameUseCase } from '../../application/use-cases/update-user-name/update-user-name.use-case';
import { UpdateUserNameCommand } from '../../application/use-cases/update-user-name/update-user-name.command';
import { UserResponseDtoMapper } from './mappers/user-response-dto.mapper';
import {
  UsersListResponseDto,
  UserResponseDto,
} from './dtos/user-response.dto';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto';
import { UpdateUserNameDto } from './dtos/update-user-name.dto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from '../../domain/value-objects/role.object';

@ApiTags('Users')
@Controller('users')
@Roles(UserRole.ADMIN)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly updateUserRoleUseCase: UpdateUserRoleUseCase,
    private readonly updateUserNameUseCase: UpdateUserNameUseCase,
    private readonly userResponseDtoMapper: UserResponseDtoMapper,
  ) {}

  @Get('')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get users in current organization',
    description:
      "Retrieve all users that belong to the current authenticated user's organization. Returns user information without sensitive data like password hashes.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved users in the organization',
    type: UsersListResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while retrieving users',
  })
  async getUsersInOrganization(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<UsersListResponseDto> {
    this.logger.log('getUsersInOrganization', { orgId });

    const users = await this.findUsersByOrgIdUseCase.execute(
      new FindUsersByOrgIdQuery(orgId),
    );

    return this.userResponseDtoMapper.toListDto(users);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user role',
    description: 'Update the role of a user. You cannot update your own role.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to update role for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateUserRoleDto,
    description: 'New role information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User role successfully updated',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid role value',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or trying to update own role',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while updating user role',
  })
  async updateUserRole(
    @Param('id') userId: UUID,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @CurrentUser(UserProperty.ID) currentUserId: UUID,
  ): Promise<UserResponseDto> {
    this.logger.log('updateUserRole', {
      userId,
      newRole: updateUserRoleDto.role,
    });

    if (userId === currentUserId) {
      throw new UnauthorizedException('You cannot update your own role');
    }

    const updatedUser = await this.updateUserRoleUseCase.execute(
      new UpdateUserRoleCommand(userId, updateUserRoleDto.role),
    );

    return this.userResponseDtoMapper.toDto(updatedUser);
  }

  @Patch('name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user name',
    description:
      "Update the name of a user. Users can only update their own name, or admins can update any user's name in their organization.",
  })
  @ApiBody({
    type: UpdateUserNameDto,
    description: 'New name information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User name successfully updated',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid name value',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description:
      "User not authenticated or not authorized to update this user's name",
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while updating user name',
  })
  async updateUserName(
    @Body() updateUserNameDto: UpdateUserNameDto,
    @CurrentUser(UserProperty.ID) currentUserId: UUID,
  ): Promise<UserResponseDto> {
    this.logger.log('updateUserName', {
      newName: updateUserNameDto.name,
    });

    const updatedUser = await this.updateUserNameUseCase.execute(
      new UpdateUserNameCommand(currentUserId, updateUserNameDto.name),
    );

    return this.userResponseDtoMapper.toDto(updatedUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Delete a user by their ID. Only users within the same organization can be deleted.',
  })
  @ApiParam({
    name: 'id',
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
    description: 'User not authenticated',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while deleting user',
  })
  async deleteUser(
    @Param('id') userId: UUID,
    @CurrentUser(UserProperty.ID) currentUserId: UUID,
  ): Promise<void> {
    this.logger.log('deleteUser', { userId });
    if (userId === currentUserId) {
      throw new UnauthorizedException('You cannot delete yourself');
    }

    await this.deleteUserUseCase.execute(new DeleteUserCommand(userId));
  }
}
