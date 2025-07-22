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
  Post,
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
import { UpdatePasswordUseCase } from '../../application/use-cases/update-password/update-password.use-case';
import { UpdatePasswordCommand } from '../../application/use-cases/update-password/update-password.command';
import { ConfirmEmailUseCase } from '../../application/use-cases/confirm-email/confirm-email.use-case';
import { ConfirmEmailCommand } from '../../application/use-cases/confirm-email/confirm-email.command';
import { ResendEmailConfirmationUseCase } from '../../application/use-cases/resend-email-confirmation/resend-email-confirmation.use-case';
import { ResendEmailConfirmationCommand } from '../../application/use-cases/resend-email-confirmation/resend-email-confirmation.command';
import { UserResponseDtoMapper } from './mappers/user-response-dto.mapper';
import {
  UsersListResponseDto,
  UserResponseDto,
} from './dtos/user-response.dto';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto';
import { UpdateUserNameDto } from './dtos/update-user-name.dto';
import { UpdatePasswordDto } from './dtos/update-password.dto';
import { ConfirmEmailDto } from './dtos/confirm-email.dto';
import { ResendEmailConfirmationDto } from './dtos/resend-email-confirmation.dto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from '../../domain/value-objects/role.object';
import { Public } from 'src/common/guards/public.guard';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { TriggerPasswordResetCommand } from '../../application/use-cases/trigger-password-reset/trigger-password-reset.command';
import { TriggerPasswordResetUseCase } from '../../application/use-cases/trigger-password-reset/trigger-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password/reset-password.use-case';
import { ResetPasswordCommand } from '../../application/use-cases/reset-password/reset-password.command';
import { RateLimit } from 'src/iam/authorization/application/decorators/rate-limit.decorator';

@ApiTags('Users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly updateUserRoleUseCase: UpdateUserRoleUseCase,
    private readonly updateUserNameUseCase: UpdateUserNameUseCase,
    private readonly updatePasswordUseCase: UpdatePasswordUseCase,
    private readonly confirmEmailUseCase: ConfirmEmailUseCase,
    private readonly resendEmailConfirmationUseCase: ResendEmailConfirmationUseCase,
    private readonly userResponseDtoMapper: UserResponseDtoMapper,
    private readonly triggerPasswordResetUseCase: TriggerPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
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

  @Roles(UserRole.ADMIN)
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
      'Update the name of a user. Users can only update their own name.',
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
    description: 'User not authenticated or not authorized to update this user',
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

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Update user password',
    description:
      'Update the password of the current authenticated user. Requires current password for verification.',
  })
  @ApiBody({
    type: UpdatePasswordDto,
    description: 'Password update information',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Password successfully updated',
  })
  @ApiBadRequestResponse({
    description: 'Invalid password values or passwords do not match',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or current password is incorrect',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while updating password',
  })
  async updatePassword(
    @Body() updatePasswordDto: UpdatePasswordDto,
    @CurrentUser(UserProperty.ID) currentUserId: UUID,
  ): Promise<void> {
    this.logger.log('updatePassword', {
      userId: currentUserId,
    });

    await this.updatePasswordUseCase.execute(
      new UpdatePasswordCommand(
        currentUserId,
        updatePasswordDto.currentPassword,
        updatePasswordDto.newPassword,
        updatePasswordDto.newPasswordConfirmation,
      ),
    );
  }

  @Public()
  @Post('confirm-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Confirm user email',
    description:
      "Confirm a user's email address using a JWT token received via email",
  })
  @ApiBody({
    type: ConfirmEmailDto,
    description: 'Email confirmation token',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Email successfully confirmed',
  })
  @ApiBadRequestResponse({
    description: 'Invalid token or token has expired',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while confirming email',
  })
  async confirmEmail(@Body() confirmEmailDto: ConfirmEmailDto): Promise<void> {
    this.logger.log('confirmEmail', { hasToken: !!confirmEmailDto.token });

    await this.confirmEmailUseCase.execute(
      new ConfirmEmailCommand(confirmEmailDto.token),
    );
  }

  @Public()
  @RateLimit({
    limit: 3,
    windowMs: 5 * 60 * 1000,
    message:
      'Too many email confirmation requests. Please wait before trying again.',
  }) // 3 attempts per 5 minutes
  @Post('resend-confirmation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Resend email confirmation',
    description:
      'Resend a confirmation email to the specified email address. Silently succeeds even if email is already verified or user does not exist for security reasons.',
  })
  @ApiBody({
    type: ResendEmailConfirmationDto,
    description: 'Email address to resend confirmation to',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Confirmation email resent (or silently handled)',
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while sending email',
  })
  async resendEmailConfirmation(
    @Body() resendEmailConfirmationDto: ResendEmailConfirmationDto,
  ): Promise<void> {
    this.logger.log('resendEmailConfirmation', {
      email: resendEmailConfirmationDto.email,
    });

    await this.resendEmailConfirmationUseCase.execute(
      new ResendEmailConfirmationCommand(resendEmailConfirmationDto.email),
    );
  }

  @Roles(UserRole.ADMIN)
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
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<void> {
    this.logger.log('deleteUser', { userId });
    if (userId === currentUserId) {
      throw new UnauthorizedException('You cannot delete yourself');
    }

    await this.deleteUserUseCase.execute(
      new DeleteUserCommand({
        userId,
        orgId,
        requestUserId: currentUserId,
      }),
    );
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Trigger password reset',
    description:
      'Send a password reset email to the provided email address. If the email exists in the system, a reset link will be sent.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email address to send reset link to',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description:
      'Password reset email sent successfully. This response is returned regardless of whether the email exists to prevent email enumeration.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format or validation errors',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error while processing the request',
  })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    this.logger.log('forgotPassword', { email: body.email });

    await this.triggerPasswordResetUseCase.execute(
      new TriggerPasswordResetCommand(body.email),
    );

    return;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Reset user password using the token received via email. The token must be valid and not expired.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Password reset information including token and new password',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Password reset successful.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request format, validation errors, or password requirements not met',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired reset token',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error while processing the request',
  })
  async resetPassword(@Body() body: ResetPasswordDto) {
    this.logger.log('resetPassword', { hasToken: !!body.resetToken });

    await this.resetPasswordUseCase.execute(
      new ResetPasswordCommand(
        body.resetToken,
        body.newPassword,
        body.newPasswordConfirmation,
      ),
    );

    return;
  }
}
