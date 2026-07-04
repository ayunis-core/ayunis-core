import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
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
import { LocalAuthGuard } from '../../application/guards/local-auth.guard';
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
import { ActiveUser } from '../../domain/active-user.entity';
import {
  setCookies,
  clearCookies,
  setMfaPendingCookie,
} from 'src/common/util/cookie.util';
import { CheckMfaLoginRequirementUseCase } from 'src/iam/mfa/application/use-cases/check-mfa-login-requirement/check-mfa-login-requirement.use-case';
import { CheckMfaLoginRequirementQuery } from 'src/iam/mfa/application/use-cases/check-mfa-login-requirement/check-mfa-login-requirement.query';
import { MfaPendingJwtService } from 'src/iam/mfa/application/services/mfa-pending-jwt.service';

// Import use cases
import { LoginUseCase } from '../../application/use-cases/login/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token/refresh-token.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user/register-user.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user/get-current-user.use-case';
import { LoginCommand } from '../../application/use-cases/login/login.command';
import { RefreshTokenCommand } from '../../application/use-cases/refresh-token/refresh-token.command';
import { RegisterUserCommand } from '../../application/use-cases/register-user/register-user.command';
import { GetCurrentUserCommand } from '../../application/use-cases/get-current-user/get-current-user.command';
import { MeResponseDtoMapper } from './mappers/me-response-dto.mapper';
import { RateLimit } from 'src/iam/authorization/application/decorators/rate-limit.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthenticationController {
  private readonly logger = new Logger(AuthenticationController.name);
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly checkMfaLoginRequirementUseCase: CheckMfaLoginRequirementUseCase,
    private readonly mfaPendingJwtService: MfaPendingJwtService,
    private readonly configService: ConfigService,
    private readonly meResponseDtoMapper: MeResponseDtoMapper,
  ) {}

  @Public()
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 }) // 10 login attempts per 15 minutes
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email and password. Sets authentication cookies on successful login.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials for authentication',
  })
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

    const mfaRequirement = await this.checkMfaLoginRequirementUseCase.execute(
      new CheckMfaLoginRequirementQuery(user.id, user.orgId),
    );

    if (mfaRequirement !== 'none') {
      return this.respondMfaPending(res, user, mfaRequirement === 'enroll');
    }

    const tokens = await this.loginUseCase.execute(new LoginCommand(user));
    setCookies(res, tokens, this.configService, true);
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
    user: ActiveUser,
    enrollmentRequired: boolean,
  ) {
    const pendingToken = this.mfaPendingJwtService.generate({
      userId: user.id,
      enrollmentRequired,
    });
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
    const tokens = await this.loginUseCase.execute(new LoginCommand(user));
    setCookies(res, tokens, this.configService, true);

    return res.json({ success: true });
  }

  @Public()
  @Post('refresh')
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

    const tokens = await this.refreshTokenUseCase.execute(
      new RefreshTokenCommand(refreshToken),
    );
    setCookies(res, tokens, this.configService, true);

    return res.json({ success: true });
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
      this.logger.debug('Access token verification failed', error);
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
      this.logger.error('Token refresh failed during me request', error);
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Not authenticated',
      });
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description: 'Log out the current user by clearing authentication cookies.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful. Authentication cookies are cleared.',
    type: SuccessResponseDto,
  })
  logout(@Res() res: Response) {
    clearCookies(res, this.configService);
    return res.json({ success: true });
  }
}
