import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from 'src/common/guards/public.guard';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { setCookies, clearMfaPendingCookie } from 'src/common/util/cookie.util';
import {
  MfaPendingJwtService,
  type MfaPendingJwtPayload,
} from 'src/iam/authentication/application/services/mfa-pending-jwt.service';
import { SetupTotpUseCase } from 'src/iam/mfa/application/use-cases/setup-totp/setup-totp.use-case';
import { SetupTotpCommand } from 'src/iam/mfa/application/use-cases/setup-totp/setup-totp.command';
import { MfaEnrollmentNotAllowedError } from 'src/iam/mfa/application/mfa.errors';
import {
  InvalidMfaPendingTokenError,
  LocalPasswordLoginDisabledError,
} from 'src/iam/authentication/application/authentication.errors';
import { MfaCodeRequestDto } from 'src/iam/mfa/presenters/http/dtos/mfa-code-request.dto';
import { MfaSetupResponseDto } from 'src/iam/mfa/presenters/http/dtos/mfa-setup-response.dto';
import {
  SuccessResponseDto,
  MfaLoginConfirmResponseDto,
} from 'src/iam/authentication/presenters/http/dtos/auth-response.dto';
import { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import type { User } from 'src/iam/users/domain/user.entity';
import {
  CompleteMfaLoginCommand,
  type CompleteMfaLoginOperation,
} from 'src/iam/authentication/application/use-cases/complete-mfa-login/complete-mfa-login.command';
import {
  CompleteMfaLoginUseCase,
  type CompleteMfaLoginResult,
} from 'src/iam/authentication/application/use-cases/complete-mfa-login/complete-mfa-login.use-case';
import {
  UserAccountLockedError,
  UserAuthenticationFailedError,
  UserNotFoundError,
} from 'src/iam/users/application/users.errors';

/**
 * Completes a login that entered the MFA pending state. All routes are
 * public in the guard sense but require a valid MFA pending cookie, which
 * only a successful primary authentication can set.
 */
@ApiTags('Authentication')
@Controller('auth/mfa')
export class MfaLoginController {
  private readonly logger = new Logger(MfaLoginController.name);

  constructor(
    private readonly mfaPendingJwtService: MfaPendingJwtService,
    private readonly setupTotpUseCase: SetupTotpUseCase,
    private readonly completeMfaLoginUseCase: CompleteMfaLoginUseCase,
    private readonly localPasswordLoginPolicy: LocalPasswordLoginPolicyService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete login with a TOTP or recovery code',
    description:
      'Requires the MFA pending cookie set by successful authentication.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: SuccessResponseDto })
  async verify(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: MfaCodeRequestDto,
  ) {
    const payload = this.readPendingToken(req);
    this.logger.log({ userId: payload.sub }, 'verify');

    await this.completeLogin(res, payload, dto.code, 'verify');
    return res.json({ success: true });
  }

  @Public()
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start forced TOTP enrollment during login',
    description:
      'Only available when the pending token has enrollmentRequired (the ' +
      'org mandates MFA and the user is not enrolled).',
  })
  @ApiResponse({ status: HttpStatus.OK, type: MfaSetupResponseDto })
  async setup(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MfaSetupResponseDto> {
    const payload = this.readPendingToken(req);
    const user = await this.authorizePendingLogin(res, payload);
    if (!payload.enrollmentRequired) {
      throw new MfaEnrollmentNotAllowedError();
    }
    this.logger.log({ userId: payload.sub }, 'setup');

    return this.setupTotpUseCase.execute(
      new SetupTotpCommand(user.id, user.email),
    );
  }

  @Public()
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @Post('setup/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm forced enrollment and complete the login',
    description:
      'Activates two-factor auth, returns the recovery codes and issues ' +
      'the session cookies.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: MfaLoginConfirmResponseDto })
  async confirmSetup(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: MfaCodeRequestDto,
  ) {
    const payload = this.readPendingToken(req);
    if (!payload.enrollmentRequired) {
      throw new MfaEnrollmentNotAllowedError();
    }
    this.logger.log({ userId: payload.sub }, 'confirmSetup');

    const recoveryCodes = await this.completeLogin(
      res,
      payload,
      dto.code,
      'confirmEnrollment',
    );
    return res.json({ success: true, recoveryCodes });
  }

  private readPendingToken(req: Request): MfaPendingJwtPayload {
    const cookieName = this.configService.get<string>(
      'auth.cookie.mfaPendingTokenName',
      'mfa_pending_token',
    );
    const token = req.cookies[cookieName] as string | undefined;
    if (!token) {
      throw new InvalidMfaPendingTokenError();
    }
    return this.mfaPendingJwtService.verify(token);
  }

  private async authorizePendingLogin(
    res: Response,
    payload: MfaPendingJwtPayload,
  ): Promise<User> {
    try {
      return await this.localPasswordLoginPolicy.assertAllowedForUser(
        payload.sub,
        payload.authenticationMethod,
      );
    } catch (error: unknown) {
      clearMfaPendingCookie(res, this.configService);
      throw error;
    }
  }

  private async completeLogin(
    res: Response,
    payload: MfaPendingJwtPayload,
    code: string,
    operation: CompleteMfaLoginOperation,
  ): Promise<string[] | null> {
    let result: CompleteMfaLoginResult;
    try {
      result = await this.completeMfaLoginUseCase.execute(
        new CompleteMfaLoginCommand({
          userId: payload.sub,
          code,
          operation,
          authenticationMethod: payload.authenticationMethod,
          zitadelSessionId: payload.zitadelSessionId,
        }),
      );
    } catch (error: unknown) {
      if (isTerminalMfaLoginError(error)) {
        clearMfaPendingCookie(res, this.configService);
      }
      throw error;
    }

    clearMfaPendingCookie(res, this.configService);
    setCookies(res, result.tokens, this.configService, true);
    return result.recoveryCodes;
  }
}

function isTerminalMfaLoginError(error: unknown): boolean {
  return (
    error instanceof LocalPasswordLoginDisabledError ||
    error instanceof UserAccountLockedError ||
    error instanceof UserAuthenticationFailedError ||
    error instanceof UserNotFoundError
  );
}
