import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oidc from 'openid-client';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import type { SsoOidcConfig } from 'src/config/sso-oidc.config';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import {
  InvalidSsoBrokerResponseError,
  InvalidSsoLogoutTokenError,
  SsoBrokerNotConfiguredError,
} from 'src/iam/sso/application/sso.errors';
import {
  OidcBrokerClient,
  type CreateOidcAuthorizationRequest,
  type OidcAuthorizationRequest,
  type ValidateOidcCallback,
  type ValidatedOidcIdentity,
} from 'src/iam/sso/application/ports/oidc-broker.client';
import {
  OidcBrokerLogoutClient,
  type ValidatedBackchannelLogout,
} from 'src/iam/sso/application/ports/oidc-broker-logout.client';

const RESOURCE_OWNER_ID_CLAIM =
  'urn:zitadel:iam:user:resourceowner:id' as const;
const RESOURCE_OWNER_SCOPE = 'urn:zitadel:iam:user:resourceowner';

interface CompleteSsoOidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  allowInsecureRequests: boolean;
  postLogoutRedirectUrl: string;
}

// URI is the protocol-defined event identifier, not a transport endpoint.
const BACKCHANNEL_LOGOUT_EVENT =
  // eslint-disable-next-line sonarjs/no-clear-text-protocols
  'http://schemas.openid.net/event/backchannel-logout';

@Injectable()
export class ZitadelOidcBrokerClient
  extends OidcBrokerClient
  implements OidcBrokerLogoutClient
{
  private configuration?: Promise<oidc.Configuration>;
  private logoutKeySet?: JWTVerifyGetKey;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async createAuthorizationRequest(
    input: CreateOidcAuthorizationRequest,
  ): Promise<OidcAuthorizationRequest> {
    const config = this.requireConfig();
    const configuration = await this.getConfiguration(config);
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const authorizationUrl = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: config.callbackUrl,
      scope: this.scopesFor(input.zitadelOrgId),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });
    return {
      authorizationUrl: authorizationUrl.href,
      codeVerifier,
      state,
      nonce,
    };
  }

  async validateCallback(
    input: ValidateOidcCallback,
  ): Promise<ValidatedOidcIdentity> {
    const config = this.requireConfig();
    const configuration = await this.getConfiguration(config);
    const callbackUrl = new URL(config.callbackUrl);
    callbackUrl.search = input.callbackParameters.toString();
    try {
      return await this.exchangeCallback(
        configuration,
        config.issuer,
        callbackUrl,
        input,
      );
    } catch (error) {
      const providerError = wrapProviderFailure(error, {
        provider: 'zitadel',
      });
      if (providerError) {
        throw providerError;
      }
      if (this.isOidcProtocolError(error)) {
        throw new InvalidSsoBrokerResponseError('callback');
      }
      throw error;
    }
  }

  createEndSessionUrl(): string {
    const config = this.requireConfig();
    const url = new URL('/oidc/v1/end_session', config.issuer);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set(
      'post_logout_redirect_uri',
      config.postLogoutRedirectUrl,
    );
    return url.href;
  }

  async validateBackchannelLogoutToken(
    logoutToken: string,
  ): Promise<ValidatedBackchannelLogout> {
    const config = this.requireConfig();
    try {
      const configuration = await this.getConfiguration(config);
      const jwksUri = this.requiredString(
        configuration.serverMetadata().jwks_uri,
        'jwks_uri',
      );
      this.logoutKeySet ??= createRemoteJWKSet(new URL(jwksUri));
      const { payload } = await jwtVerify(logoutToken, this.logoutKeySet, {
        issuer: config.issuer,
        audience: config.clientId,
        requiredClaims: ['iat', 'exp', 'jti'],
      });
      return this.validatedLogoutClaims(payload, config.issuer);
    } catch (error) {
      const providerError = wrapProviderFailure(error, {
        provider: 'zitadel',
      });
      if (providerError) throw providerError;
      if (error instanceof InvalidSsoLogoutTokenError) throw error;
      throw new InvalidSsoLogoutTokenError();
    }
  }

  private async exchangeCallback(
    configuration: oidc.Configuration,
    issuer: string,
    callbackUrl: URL,
    input: ValidateOidcCallback,
  ): Promise<ValidatedOidcIdentity> {
    const tokens = await oidc.authorizationCodeGrant(
      configuration,
      callbackUrl,
      {
        pkceCodeVerifier: input.codeVerifier,
        expectedState: input.expectedState,
        expectedNonce: input.expectedNonce,
        idTokenExpected: true,
      },
    );
    const claims = tokens.claims();
    const subject = this.requiredString(claims?.sub, 'sub');
    const accessToken = this.requiredString(
      tokens.access_token,
      'access_token',
    );
    const userInfo = await oidc.fetchUserInfo(
      configuration,
      accessToken,
      subject,
    );
    return {
      issuer,
      subject,
      email: this.requiredString(userInfo.email, 'email'),
      name: this.displayName(userInfo),
      emailVerified: this.requiredBoolean(
        userInfo.email_verified,
        'email_verified',
      ),
      zitadelOrgId: this.requiredString(
        userInfo[RESOURCE_OWNER_ID_CLAIM],
        RESOURCE_OWNER_ID_CLAIM,
      ),
      sessionId: this.optionalString(claims?.sid, 'sid'),
      authenticationMethods: this.optionalStringArray(claims?.amr),
    };
  }

  private isOidcProtocolError(error: unknown): boolean {
    return (
      error instanceof oidc.ClientError ||
      error instanceof oidc.AuthorizationResponseError ||
      error instanceof oidc.ResponseBodyError ||
      error instanceof oidc.WWWAuthenticateChallengeError
    );
  }

  private requireConfig(): CompleteSsoOidcConfig {
    const config = this.configService.get<SsoOidcConfig>('ssoOidc');
    if (
      !config?.issuer ||
      !config.clientId ||
      !config.clientSecret ||
      !config.callbackUrl
    ) {
      throw new SsoBrokerNotConfiguredError();
    }
    return {
      issuer: config.issuer,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      callbackUrl: config.callbackUrl,
      allowInsecureRequests: config.allowInsecureRequests,
      postLogoutRedirectUrl: this.configService.get<string>(
        'app.frontend.baseUrl',
        'http://localhost:3001',
      ),
    };
  }

  private validatedLogoutClaims(
    payload: JWTPayload,
    issuer: string,
  ): ValidatedBackchannelLogout {
    const events = payload.events;
    const subject = this.optionalString(payload.sub, 'sub');
    const sessionId = this.optionalString(payload.sid, 'sid');
    const issuedAt = payload.iat;
    if (
      'nonce' in payload ||
      typeof events !== 'object' ||
      events === null ||
      !(BACKCHANNEL_LOGOUT_EVENT in events) ||
      (!subject && !sessionId) ||
      typeof issuedAt !== 'number' ||
      issuedAt > Math.floor(Date.now() / 1000) + 60
    ) {
      throw new InvalidSsoLogoutTokenError();
    }
    return { issuer, subject, sessionId };
  }

  private async getConfiguration(
    config: CompleteSsoOidcConfig,
  ): Promise<oidc.Configuration> {
    const pending =
      this.configuration ??
      oidc.discovery(
        new URL(config.issuer),
        config.clientId,
        config.clientSecret,
        oidc.ClientSecretBasic(config.clientSecret),
        this.discoveryOptions(config),
      );
    this.configuration = pending;
    try {
      return await pending;
    } catch (error) {
      if (this.configuration === pending) {
        this.configuration = undefined;
      }
      const providerError = wrapProviderFailure(error, {
        provider: 'zitadel',
      });
      if (providerError) {
        throw providerError;
      }
      throw error;
    }
  }

  private discoveryOptions(
    config: CompleteSsoOidcConfig,
  ): oidc.DiscoveryRequestOptions | undefined {
    if (!config.allowInsecureRequests) {
      return undefined;
    }
    // Local Zitadel uses loopback HTTP; env validation forbids this elsewhere.
    // eslint-disable-next-line sonarjs/deprecation
    return { execute: [oidc.allowInsecureRequests] };
  }

  private scopesFor(zitadelOrgId: string): string {
    return [
      'openid',
      'profile',
      'email',
      RESOURCE_OWNER_SCOPE,
      `urn:zitadel:iam:org:id:${zitadelOrgId}`,
    ].join(' ');
  }

  private requiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.length === 0) {
      throw new InvalidSsoBrokerResponseError(field);
    }
    return value;
  }

  private requiredBoolean(value: unknown, field: string): boolean {
    if (typeof value !== 'boolean') {
      throw new InvalidSsoBrokerResponseError(field);
    }
    return value;
  }

  private displayName(userInfo: oidc.UserInfoResponse): string {
    const name = this.optionalString(userInfo.name, 'name');
    const preferredUsername = this.optionalString(
      userInfo.preferred_username,
      'preferred_username',
    );
    return (
      name ?? preferredUsername ?? this.requiredString(userInfo.email, 'email')
    );
  }

  private optionalString(value: unknown, field: string): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      throw new InvalidSsoBrokerResponseError(field);
    }
    return value.trim() || undefined;
  }

  private optionalStringArray(value: unknown): string[] {
    if (value === undefined || value === null) return [];
    if (!this.isNonEmptyStringArray(value)) {
      return [];
    }
    return [...value];
  }

  private isNonEmptyStringArray(value: unknown): value is string[] {
    return (
      Array.isArray(value) &&
      value.every(
        (entry: unknown): entry is string =>
          typeof entry === 'string' && entry.length > 0,
      )
    );
  }
}
