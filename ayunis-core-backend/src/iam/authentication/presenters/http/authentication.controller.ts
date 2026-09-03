import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { LocalAuthGuard } from 'src/iam/authentication/application/guards/local-auth.guard';
import { Public } from 'src/common/guards/public.guard';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import {
  SuccessResponseDto,
  ErrorResponseDto,
  LoginResponseDto,
  MeResponseDto,
} from './dtos/auth-response.dto';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import {
  setCookies,
  clearCookies,
  setMfaPendingCookie,
} from 'src/common/util/cookie.util';
import { StartAuthenticatedSessionCommand } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.command';
import { StartAuthenticatedSessionUseCase } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.use-case';

const LOGIN_BODY_DESCRIPTION = 'User credentials for authentication';

import { LoginUseCase } from 'src/iam/authentication/application/use-cases/login/login.use-case';
import { RefreshTokenUseCase } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.use-case';
import { RegisterUserUseCase } from 'src/iam/authentication/application/use-cases/register-user/register-user.use-case';
import { GetCurrentUserUseCase } from 'src/iam/authentication/application/use-cases/get-current-user/get-current-user.use-case';
import { LoginCommand } from 'src/iam/authentication/application/use-cases/login/login.command';
import { RefreshTokenCommand } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.command';
import { RegisterUserCommand } from 'src/iam/authentication/application/use-cases/register-user/register-user.command';
import { GetCurrentUserCommand } from 'src/iam/authentication/application/use-cases/get-current-user/get-current-user.command';
import { MeResponseDtoMapper } from './mappers/me-response-dto.mapper';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

@ApiTags('Authentication')
@Controller('auth')
export class AuthenticationController {
  private readonly logger = new Logger(AuthenticationController.name);

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly startAuthenticatedSession: StartAuthenticatedSessionUseCase,
    private readonly configService: ConfigService,
    private readonly meResponseDtoMapper: MeResponseDtoMapper,
  ) {}

  @Public()
  // Must stay above DEFAULT_ACCOUNT_LOCKOUT_MAX_ATTEMPTS so the per-account
  // lockout fires before this per-IP limit masks it with a 429.
  @RateLimit({ limit: 20, windowMs: 15 * 60 * 1000 })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email and password. Sets authentication cookies on successful login.',
  })
  @ApiBody({ type: LoginDto, description: LOGIN_BODY_DESCRIPTION })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Credentials accepted. Session cookies are set unless mfaRequired is ' +
      'true, in which case a short-lived MFA pending cookie is set instead.',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format',
    type: ErrorResponseDto,
  })
  async login(@Req() req: Request, @Res() res: Response) {
    this.logger.log('login');
    const user = req.user as ActiveUser;

    const result = await this.startAuthenticatedSession.execute(
      new StartAuthenticatedSessionCommand(
        user,
        SessionAuthenticationMethod.PASSWORD,
      ),
    );
    if (result.status === 'mfa_required') {
      return this.respondMfaPending(
        res,
        result.mfaPendingToken,
        result.enrollmentRequired,
      );
    }
    setCookies(res, result.tokens, this.configService, true);
    return res.json({
      success: true,
      mfaRequired: false,
      enrollmentRequired: false,
    } satisfies LoginResponseDto);
  }

  /**
   * Withholds session cookies and issues the short-lived MFA pending cookie
   * instead; the login completes via the /auth/mfa endpoints.
   */
  private respondMfaPending(
    res: Response,
    pendingToken: string,
    enrollmentRequired: boolean,
  ) {
    setMfaPendingCookie(res, pendingToken, this.configService);
    return res.json({
      success: true,
      mfaRequired: true,
      enrollmentRequired,
    } satisfies LoginResponseDto);
  }

  @Public()
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 }) // 5 registration attempts per hour
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User registration',
    description:
      'Register a new user account with email, password, and organization name. Automatically logs in the user and sets authentication cookies.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration information',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'Registration successful. User is automatically logged in and authentication cookies are set.',
    type: SuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format or validation errors',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists',
    type: ErrorResponseDto,
  })
  async register(@Body() body: RegisterDto, @Res() res: Response) {
    const user = await this.registerUserUseCase.execute(
      new RegisterUserCommand({
        userName: body.userName,
        email: body.email,
        password: body.password,
        orgName: body.orgName,
        hasAcceptedMarketing: body.marketingAcceptance,
        department: body.department,
      }),
    );
    const tokens = await this.loginUseCase.execute(
      new LoginCommand(user, SessionAuthenticationMethod.PASSWORD),
    );
    setCookies(res, tokens, this.configService, true);

    return res.json({ success: true });
  }

  @Public()
  @Post('refresh')
  // Every rotation writes a refresh-token row, so an uncapped endpoint lets a
  // token holder grow the table without bound. The limit is per IP and refresh
  // fires automatically for every active session, so it must stay generous
  // enough for many municipal users sharing one NAT address.
  @RateLimit({ limit: 300, windowMs: 15 * 60 * 1000 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh authentication tokens',
    description:
      'Refresh expired access tokens using the refresh token stored in cookies. Returns new authentication cookies.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Token refresh successful. New authentication cookies are set.',
    type: SuccessResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Authentication configuration error',
    type: ErrorResponseDto,
  })
  async refresh(@Req() req: Request, @Res() res: Response) {
    this.logger.log('refresh');
    const refreshTokenName = this.configService.get<string>(
      'auth.cookie.refreshTokenName',
    );
    if (!refreshTokenName) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Authentication configuration error',
      });
    }

    const cookies = req.cookies as Record<string, string>;
    const refreshToken = cookies[refreshTokenName];

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Refresh token not provided',
      });
    }

    return this.performRefresh(res, refreshToken);
  }

  private async performRefresh(
    res: Response,
    refreshToken: string,
  ): Promise<Response> {
    try {
      const tokens = await this.refreshTokenUseCase.execute(
        new RefreshTokenCommand(refreshToken),
      );
      setCookies(res, tokens, this.configService, true);
      return res.json({ success: true });
    } catch (error) {
      // Any refresh failure (expired, reuse/theft, unknown) leaves the browser
      // holding a useless refresh cookie — clear it so the client logs out
      // cleanly instead of retrying a doomed token.
      this.logger.warn(
        { err: error as Error },
        'Refresh failed; clearing cookies',
      );
      clearCookies(res, this.configService);
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid refresh token' });
    }
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user information',
    description:
      "Get the current authenticated user's email and role. If access token is expired but refresh token is valid, automatically refreshes tokens and sets new cookies.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'User information retrieved successfully. If tokens were refreshed, new cookies are set.',
    type: MeResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Not authenticated - no valid tokens found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Authentication configuration error',
    type: ErrorResponseDto,
  })
  async me(@Req() req: Request, @Res() res: Response) {
    this.logger.log('me');

    const accessTokenName = this.configService.get<string>(
      'auth.cookie.accessTokenName',
    );
    const refreshTokenName = this.configService.get<string>(
      'auth.cookie.refreshTokenName',
    );

    if (!accessTokenName || !refreshTokenName) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Authentication configuration error',
      });
    }

    const cookies = req.cookies as Record<string, string>;
    const accessToken = cookies[accessTokenName];
    const refreshToken = cookies[refreshTokenName];

    // First, try to get user info from access token
    const currentUser = await this.tryGetUserFromAccessToken(accessToken);
    if (currentUser) {
      return res.json(this.meResponseDtoMapper.toDto(currentUser));
    }

    // If access token is invalid/missing, try refresh token
    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    return this.refreshAndRespondWithUser(res, refreshToken);
  }

  private async tryGetUserFromAccessToken(
    accessToken: string | undefined,
  ): Promise<ActiveUser | null> {
    if (!accessToken) {
      return null;
    }
    try {
      return await this.getCurrentUserUseCase.execute(
        new GetCurrentUserCommand(accessToken),
      );
    } catch (error) {
      this.logger.debug(
        { err: error as Error },
        'Access token verification failed',
      );
      return null;
    }
  }

  private async refreshAndRespondWithUser(
    res: Response,
    refreshToken: string,
  ): Promise<Response> {
    try {
      // Try to refresh tokens - this will validate the refresh token
      const tokens = await this.refreshTokenUseCase.execute(
        new RefreshTokenCommand(refreshToken),
      );

      // Set new cookies with refreshed tokens
      setCookies(res, tokens, this.configService, true);

      // Get user info from the new access token
      const user = await this.getCurrentUserUseCase.execute(
        new GetCurrentUserCommand(tokens.access_token),
      );
      return res.json(this.meResponseDtoMapper.toDto(user));
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Token refresh failed during me request',
      );
      // Clear the now-useless refresh cookie so the client logs out cleanly.
      clearCookies(res, this.configService);
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Not authenticated',
      });
    }
  }
}
