import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from '../../../authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from '../../domain/value-objects/role.object';
import { AdminUpdateUserUseCase } from '../../application/use-cases/admin-update-user/admin-update-user.use-case';
import { AdminUpdateUserCommand } from '../../application/use-cases/admin-update-user/admin-update-user.command';
import { AdminUpdateUserDto } from './dtos/admin-update-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UserResponseDtoMapper } from './mappers/user-response-dto.mapper';

@ApiTags('Users')
@Controller('users')
export class AdminUserController {
  private readonly logger = new Logger(AdminUserController.name);

  constructor(
    private readonly adminUpdateUserUseCase: AdminUpdateUserUseCase,
    private readonly userResponseDtoMapper: UserResponseDtoMapper,
  ) {}

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a user (admin)',
    description:
      "Update another user's name and/or email within your organization. You cannot edit your own profile through this endpoint.",
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to update',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: AdminUpdateUserDto,
    description: 'Fields to update (at least one of name or email)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully updated',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or no fields to update',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description:
      'User not authenticated, trying to edit own profile, or target user is in a different organization',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while updating user',
  })
  async adminUpdateUser(
    @Param('id') userId: UUID,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser(UserProperty.ID) currentUserId: UUID,
  ): Promise<UserResponseDto> {
    this.logger.log('adminUpdateUser', {
      userId,
      hasName: dto.name !== undefined,
      hasEmail: dto.email !== undefined,
    });

    if (userId === currentUserId) {
      throw new UnauthorizedException(
        'You cannot edit your own profile through this endpoint',
      );
    }

    const updatedUser = await this.adminUpdateUserUseCase.execute(
      new AdminUpdateUserCommand(userId, dto.name, dto.email),
    );

    return this.userResponseDtoMapper.toDto(updatedUser);
  }
}
