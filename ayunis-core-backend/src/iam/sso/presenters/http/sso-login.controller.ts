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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { Public } from 'src/common/guards/public.guard';
import { CompleteOrgSsoLoginCommand } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.command';
import { CompleteOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/complete-org-sso-login/complete-org-sso-login.use-case';
import { DiscoverOrgSsoQuery } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.query';
import { DiscoverOrgSsoUseCase } from 'src/iam/sso/application/use-cases/discover-org-sso/discover-org-sso.use-case';
import { StartOrgSsoLoginCommand } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.command';
import { StartOrgSsoLoginUseCase } from 'src/iam/sso/application/use-cases/start-org-sso-login/start-org-sso-login.use-case';
import { DiscoverSsoDto } from 'src/iam/sso/presenters/http/dto/discover-sso.request-dto';
import { SsoDiscoveryResponseDto } from 'src/iam/sso/presenters/http/dto/sso-discovery.response-dto';
import { ProvisionOrgSsoUserCommand } from 'src/iam/sso/application/use-cases/provision-org-sso-user/provision-org-sso-user.command';
import { ProvisionOrgSsoUserUseCase } from 'src/iam/sso/application/use-cases/provision-org-sso-user/provision-org-sso-user.use-case';

const SSO_LOGIN_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

@ApiTags('SSO')
@Controller('auth/sso')
export class SsoLoginController {
  constructor(
    private readonly discoverOrgSso: DiscoverOrgSsoUseCase,
    private readonly startOrgSsoLogin: StartOrgSsoLoginUseCase,
    private readonly completeOrgSsoLogin: CompleteOrgSsoLoginUseCase,
    private readonly provisionOrgSsoUser: ProvisionOrgSsoUserUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @RateLimit({ limit: 300, windowMs: 15 * 60 * 1000 })
  @Post('discover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discover enabled SSO from a work email' })
  @ApiOkResponse({ type: SsoDiscoveryResponseDto })
  discover(@Body() body: DiscoverSsoDto): Promise<SsoDiscoveryResponseDto> {
    return this.discoverOrgSso.execute(new DiscoverOrgSsoQuery(body.email));
  }

  @Public()
  @RateLimit({ limit: 300, windowMs: 15 * 60 * 1000 })
  @Get('organizations/:orgId/start')
  @Redirect(undefined, HttpStatus.FOUND)
  @ApiOperation({ summary: 'Start SSO for an enabled organization' })
  @ApiFoundResponse({ description: 'Redirect to the identity broker' })
  async start(
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ url: string; statusCode: number }> {
    const { authorizationUrl, browserBinding } =
      await this.startOrgSsoLogin.execute(new StartOrgSsoLoginCommand(orgId));
    // A cached authorize redirect would reuse a spent transaction and a stale
    // correlation cookie, so the callback's browser binding check would fail.
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(this.correlationCookieName(), browserBinding, {
      ...this.correlationCookieOptions(),
      maxAge: SSO_LOGIN_COOKIE_MAX_AGE_MS,
    });
    return { url: authorizationUrl, statusCode: HttpStatus.FOUND };
  }

  @Public()
  @RateLimit({ limit: 300, windowMs: 15 * 60 * 1000 })
  @Get('oidc/callback')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Validate an organization-pinned OIDC callback' })
  @ApiNoContentResponse({ description: 'OIDC response validated' })
  async callback(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const callbackParameters = new URL(request.originalUrl, 'http://localhost')
      .searchParams;
    const cookieName = this.correlationCookieName();
    const browserBinding = this.cookieValue(request, cookieName);
    const login = await this.completeOrgSsoLogin.execute(
      new CompleteOrgSsoLoginCommand(callbackParameters, browserBinding),
    );
    await this.provisionOrgSsoUser.execute(
      new ProvisionOrgSsoUserCommand(login),
    );
    response.clearCookie(cookieName, this.correlationCookieOptions());
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
