import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { Public } from 'src/common/guards/public.guard';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { setCookies, clearMfaPendingCookie } from 'src/common/util/cookie.util';
import { ActiveUser } from '../../domain/active-user.entity';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case';
import { LoginCommand } from '../../application/use-cases/login/login.command';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import type { MfaPendingJwtPayload } from 'src/iam/mfa/application/services/mfa-pending-jwt.service';
import { MfaPendingJwtService } from 'src/iam/mfa/application/services/mfa-pending-jwt.service';
import { VerifyMfaCodeUseCase } from 'src/iam/mfa/application/use-cases/verify-mfa-code/verify-mfa-code.use-case';
import { VerifyMfaCodeCommand } from 'src/iam/mfa/application/use-cases/verify-mfa-code/verify-mfa-code.command';
import { SetupTotpUseCase } from 'src/iam/mfa/application/use-cases/setup-totp/setup-totp.use-case';
import { SetupTotpCommand } from 'src/iam/mfa/application/use-cases/setup-totp/setup-totp.command';
import { ConfirmTotpUseCase } from 'src/iam/mfa/application/use-cases/confirm-totp/confirm-totp.use-case';
import { ConfirmTotpCommand } from 'src/iam/mfa/application/use-cases/confirm-totp/confirm-totp.command';
import {
  InvalidMfaPendingTokenError,
  MfaEnrollmentNotAllowedError,
} from 'src/iam/mfa/application/mfa.errors';
import { MfaCodeRequestDto } from 'src/iam/mfa/presenters/http/dtos/mfa-code-request.dto';
import { MfaSetupResponseDto } from 'src/iam/mfa/presenters/http/dtos/mfa-setup-response.dto';
import {
  SuccessResponseDto,
  MfaLoginConfirmResponseDto,
} from './dtos/auth-response.dto';

/**
 * Completes a login that entered the MFA pending state. All routes are
 * public in the guard sense but require a valid MFA pending cookie, which
 * only a successful password login can set.
 */
@ApiTags('Authentication')
@Controller('auth/mfa')
export class MfaLoginController {
  private readonly logger = new Logger(MfaLoginController.name);

  constructor(
    private readonly mfaPendingJwtService: MfaPendingJwtService,
    private readonly verifyMfaCodeUseCase: VerifyMfaCodeUseCase,
    private readonly setupTotpUseCase: SetupTotpUseCase,
    private readonly confirmTotpUseCase: ConfirmTotpUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete login with a TOTP or recovery code',
    description:
      'Requires the MFA pending cookie set by a successful password login.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: SuccessResponseDto })
  async verify(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: MfaCodeRequestDto,
  ) {
    const payload = this.readPendingToken(req);
    this.logger.log('verify', { userId: payload.sub });

    await this.verifyMfaCodeUseCase.execute(
      new VerifyMfaCodeCommand(payload.sub, dto.code),
    );
    await this.completeLogin(res, payload.sub);
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
  async setup(@Req() req: Request): Promise<MfaSetupResponseDto> {
    const payload = this.readPendingToken(req);
    if (!payload.enrollmentRequired) {
      throw new MfaEnrollmentNotAllowedError();
    }
    this.logger.log('setup', { userId: payload.sub });

    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(payload.sub),
    );
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
    this.logger.log('confirmSetup', { userId: payload.sub });

    const recoveryCodes = await this.confirmTotpUseCase.execute(
      new ConfirmTotpCommand(payload.sub, dto.code),
    );
    await this.completeLogin(res, payload.sub);
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

  private async completeLogin(res: Response, userId: UUID): Promise<void> {
    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(userId),
    );
    const tokens = await this.loginUseCase.execute(
      new LoginCommand(
        new ActiveUser({
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          role: user.role,
          systemRole: user.systemRole,
          orgId: user.orgId,
          name: user.name,
        }),
      ),
    );

    clearMfaPendingCookie(res, this.configService);
    setCookies(res, tokens, this.configService, true);
  }
}
