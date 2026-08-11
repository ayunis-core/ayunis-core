import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oidc from 'openid-client';
import type { SsoOidcConfig } from 'src/config/sso-oidc.config';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import {
  InvalidSsoBrokerResponseError,
  SsoBrokerNotConfiguredError,
} from 'src/iam/sso/application/sso.errors';
import {
  OidcBrokerClient,
  type CreateOidcAuthorizationRequest,
  type OidcAuthorizationRequest,
  type ValidateOidcCallback,
  type ValidatedOidcIdentity,
} from 'src/iam/sso/application/ports/oidc-broker.client';

const RESOURCE_OWNER_ID_CLAIM =
  'urn:zitadel:iam:user:resourceowner:id' as const;
const RESOURCE_OWNER_SCOPE = 'urn:zitadel:iam:user:resourceowner';

interface CompleteSsoOidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  allowInsecureRequests: boolean;
}

@Injectable()
export class ZitadelOidcBrokerClient extends OidcBrokerClient {
  private configuration?: Promise<oidc.Configuration>;

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
      emailVerified: this.requiredBoolean(
        userInfo.email_verified,
        'email_verified',
      ),
      zitadelOrgId: this.requiredString(
        userInfo[RESOURCE_OWNER_ID_CLAIM],
        RESOURCE_OWNER_ID_CLAIM,
      ),
      sessionId: this.optionalString(claims?.sid, 'sid'),
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
    };
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

  private optionalString(value: unknown, field: string): string | undefined {
    return value === undefined ? undefined : this.requiredString(value, field);
  }
}
