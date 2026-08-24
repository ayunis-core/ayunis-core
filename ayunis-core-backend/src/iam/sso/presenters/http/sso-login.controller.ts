import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiFoundResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { ApplicationError } from 'src/common/errors/base.error';
import { reportUnexpectedError } from 'src/common/errors/report-unexpected-error.helper';
import { Public } from 'src/common/guards/public.guard';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import {
  clearCookies,
  clearMfaPendingCookie,
  setCookies,
  setMfaPendingCookie,
} from 'src/common/util/cookie.util';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import type { StartAuthenticatedSessionResult } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.use-case';
import { CompleteSsoAuthenticationCommand } from 'src/iam/sso/application/use-cases/complete-sso-authentication/complete-sso-authentication.command';
import { CompleteSsoAuthenticationUseCase } from 'src/iam/sso/application/use-cases/complete-sso-authentication/complete-sso-authentication.use-case';
import { DiscoverOrgSsoQuery } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.query';
import { DiscoverOrgSsoUseCase } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.use-case';
import { StartOrgSsoLoginCommand } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.command';
import { StartOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.use-case';
import { StartSsoAccountLinkCommand } from 'src/iam/sso/application/use-cases/start-sso-account-link/start-sso-account-link.command';
import { StartSsoAccountLinkUseCase } from 'src/iam/sso/application/use-cases/start-sso-account-link/start-sso-account-link.use-case';
import { DiscoverSsoDto } from 'src/iam/sso/presenters/http/dto/discover-sso.request-dto';
import { SsoAuthorizationResponseDto } from 'src/iam/sso/presenters/http/dto/sso-authorization.response-dto';
import { HandleSsoBackchannelLogoutCommand } from 'src/iam/sso/application/use-cases/handle-sso-backchannel-logout/handle-sso-backchannel-logout.command';
import { HandleSsoBackchannelLogoutUseCase } from 'src/iam/sso/application/use-cases/handle-sso-backchannel-logout/handle-sso-backchannel-logout.use-case';
import { SsoBackchannelLogoutRequestDto } from 'src/iam/sso/presenters/http/dto/sso-backchannel-logout.request-dto';
import { SsoDiscoveryResponseDto } from 'src/iam/sso/presenters/http/dto/sso-discovery.response-dto';
import { SsoErrorCode } from 'src/iam/sso/application/sso.errors';

const SSO_LOGIN_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

interface BrowserRedirect {
  url: string;
  statusCode: HttpStatus.FOUND;
}

@ApiTags('SSO')
@Controller('auth/sso')
export class SsoLoginController {
  constructor(
    private readonly discoverOrgSso: DiscoverOrgSsoUseCase,
    private readonly startOrgSsoLogin: StartOrgSsoLoginUseCase,
    private readonly completeSsoAuthentication: CompleteSsoAuthenticationUseCase,
    private readonly startSsoAccountLink: StartSsoAccountLinkUseCase,
    private readonly handleSsoBackchannelLogout: HandleSsoBackchannelLogoutUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @RequireFeature(FeatureFlag.SsoLogin)
  @RateLimit({ limit: 300, windowMs: 15 * 60 * 1000 })
  @Post('discover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discover enabled SSO from a work email' })
  @ApiOkResponse({ type: SsoDiscoveryResponseDto })
  discover(@Body() body: DiscoverSsoDto): Promise<SsoDiscoveryResponseDto> {
    return this.discoverOrgSso.execute(new DiscoverOrgSsoQuery(body.email));
  }

  @Public()
  @RequireFeature(FeatureFlag.SsoLogin)
  @RateLimit({ limit: 300, windowMs: 15 * 60 * 1000 })
  @Get('organizations/:orgId/start')
  @Redirect(undefined, HttpStatus.FOUND)
  @ApiOperation({ summary: 'Start SSO for an enabled organization' })
  @ApiFoundResponse({ description: 'Redirect to the identity broker' })
  async start(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BrowserRedirect> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const { authorizationUrl, browserBinding } =
        await this.startOrgSsoLogin.execute(new StartOrgSsoLoginCommand(orgId));
      // A cached authorize redirect would reuse a spent transaction and a stale
      // correlation cookie, so the callback's browser binding check would fail.
      response.cookie(this.correlationCookieName(), browserBinding, {
        ...this.correlationCookieOptions(),
        maxAge: SSO_LOGIN_COOKIE_MAX_AGE_MS,
      });
      return { url: authorizationUrl, statusCode: HttpStatus.FOUND };
    } catch (error) {
      reportUnexpectedError(error);
      return this.errorRedirect(error);
    }
  }

  @RequireFeature(FeatureFlag.SsoLogin)
  @RateLimit({ limit: 300, windowMs: 15 * 60 * 1000 })
  @Post('link/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start linking SSO to the current account' })
  @ApiOkResponse({ type: SsoAuthorizationResponseDto })
  async startLink(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SsoAuthorizationResponseDto> {
    const { authorizationUrl, browserBinding } =
      await this.startSsoAccountLink.execute(
        new StartSsoAccountLinkCommand(userId, orgId),
      );
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(this.correlationCookieName(), browserBinding, {
      ...this.correlationCookieOptions(),
      maxAge: SSO_LOGIN_COOKIE_MAX_AGE_MS,
    });
    return { authorizationUrl };
  }

  @Public()
  @RequireFeature(FeatureFlag.SsoLogin)
  @RateLimit({ limit: 300, windowMs: 15 * 60 * 1000 })
  @Get('oidc/callback')
  @Redirect(undefined, HttpStatus.FOUND)
  @ApiOperation({ summary: 'Complete an organization-pinned SSO login' })
  @ApiFoundResponse({
    description: 'Core session or MFA-pending cookie issued and redirected',
  })
  async callback(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BrowserRedirect> {
    response.setHeader('Cache-Control', 'no-store');
    const callbackParameters = new URL(request.originalUrl, 'http://localhost')
      .searchParams;
    const cookieName = this.correlationCookieName();
    const browserBinding = this.cookieValue(request, cookieName);
    try {
      const result = await this.completeSsoAuthentication.execute(
        new CompleteSsoAuthenticationCommand(
          callbackParameters,
          browserBinding,
        ),
      );
      if (result.kind === 'authenticated') {
        this.setSessionCookies(response, result.session);
      }
      response.clearCookie(cookieName, this.correlationCookieOptions());
      return this.frontendRedirect(result.redirectPath);
    } catch (error) {
      reportUnexpectedError(error);
      return this.errorRedirect(error);
    }
  }

  @Public()
  @RequireFeature(FeatureFlag.SsoLogin)
  @RateLimit({ limit: 3000, windowMs: 15 * 60 * 1000 })
  @Post('oidc/backchannel-logout')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'Process a signed broker back-channel logout' })
  @ApiOkResponse({ description: 'Matching Core SSO sessions revoked' })
  async backchannelLogout(
    @Body() body: SsoBackchannelLogoutRequestDto,
  ): Promise<void> {
    await this.handleSsoBackchannelLogout.execute(
      new HandleSsoBackchannelLogoutCommand(body.logout_token),
    );
  }

  private setSessionCookies(
    response: Response,
    result: StartAuthenticatedSessionResult,
  ): void {
    if (result.status === 'authenticated') {
      clearMfaPendingCookie(response, this.configService);
      setCookies(response, result.tokens, this.configService, true);
      return;
    }
    clearCookies(response, this.configService);
    setMfaPendingCookie(response, result.mfaPendingToken, this.configService);
  }

  private errorRedirect(error: unknown): BrowserRedirect {
    const code =
      error instanceof ApplicationError ? error.code : SsoErrorCode.UNEXPECTED;
    const url = new URL('/sso/error', this.frontendBaseUrl());
    url.searchParams.set('code', code);
    return { url: url.toString(), statusCode: HttpStatus.FOUND };
  }

  private frontendRedirect(path: string): BrowserRedirect {
    return {
      url: new URL(path, this.frontendBaseUrl()).toString(),
      statusCode: HttpStatus.FOUND,
    };
  }

  private frontendBaseUrl(): string {
    return this.configService.get<string>(
      'app.frontend.baseUrl',
      'http://localhost:3001',
    );
  }

  private correlationCookieName(): string {
    return this.configService.get<boolean>('auth.cookie.secure', false)
      ? '__Host-ayunis_sso_login'
      : 'ayunis_sso_login';
  }

  private correlationCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('auth.cookie.secure', false),
      sameSite: 'lax',
      path: '/',
    };
  }

  private cookieValue(request: Request, name: string): string | undefined {
    const value = (request.cookies as Record<string, unknown> | undefined)?.[
      name
    ];
    return typeof value === 'string' ? value : undefined;
  }
}
