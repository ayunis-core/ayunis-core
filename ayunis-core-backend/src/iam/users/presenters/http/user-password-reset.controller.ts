import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
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
import { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from '../../domain/value-objects/role.object';
import { Public } from 'src/common/guards/public.guard';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ValidatePasswordResetTokenDto } from './dtos/validate-password-reset-token.dto';
import { TriggerPasswordResetCommand } from '../../application/use-cases/trigger-password-reset/trigger-password-reset.command';
import { TriggerPasswordResetUseCase } from '../../application/use-cases/trigger-password-reset/trigger-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password/reset-password.use-case';
import { ResetPasswordCommand } from '../../application/use-cases/reset-password/reset-password.command';
import { ValidatePasswordResetTokenUseCase } from '../../application/use-cases/validate-password-reset-token/validate-password-reset-token.use-case';
import { ValidatePasswordResetTokenQuery } from '../../application/use-cases/validate-password-reset-token/validate-password-reset-token.query';
import { AdminTriggerPasswordResetUseCase } from '../../application/use-cases/admin-trigger-password-reset/admin-trigger-password-reset.use-case';
import { AdminTriggerPasswordResetCommand } from '../../application/use-cases/admin-trigger-password-reset/admin-trigger-password-reset.command';

@ApiTags('Users')
@Controller('users')
export class UserPasswordResetController {
  private readonly logger = new Logger(UserPasswordResetController.name);

  constructor(
    private readonly triggerPasswordResetUseCase: TriggerPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly validatePasswordResetTokenUseCase: ValidatePasswordResetTokenUseCase,
    private readonly adminTriggerPasswordResetUseCase: AdminTriggerPasswordResetUseCase,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post(':id/trigger-password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Trigger password reset for a user',
    description:
      'Send a password reset email to a user in your organization. Only organization admins can use this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID to send password reset email to',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Password reset email sent successfully',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({
    description: "Not authorized to reset this user's password",
  })
  async triggerPasswordResetForUser(@Param('id') userId: UUID): Promise<void> {
    this.logger.log('triggerPasswordResetForUser', { userId });

    await this.adminTriggerPasswordResetUseCase.execute(
      new AdminTriggerPasswordResetCommand(userId),
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
  }

  @Public()
  @Get('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate password reset token',
    description:
      'Validate a password reset token without performing the actual password reset. Used to check if a token is valid before showing the reset form.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired reset token',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error while processing the request',
  })
  validateResetToken(@Query() query: ValidatePasswordResetTokenDto) {
    this.logger.log('validateResetToken', { hasToken: !!query.token });

    return this.validatePasswordResetTokenUseCase.execute(
      new ValidatePasswordResetTokenQuery(query.token),
    );
  }
}
