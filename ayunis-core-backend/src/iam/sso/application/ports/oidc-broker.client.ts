export interface OidcAuthorizationRequest {
  authorizationUrl: string;
  codeVerifier: string;
  nonce: string;
  state: string;
}

export interface CreateOidcAuthorizationRequest {
  zitadelOrgId: string;
}

export interface ValidateOidcCallback {
  callbackParameters: URLSearchParams;
  codeVerifier: string;
  expectedState: string;
  expectedNonce: string;
}

export interface ValidatedOidcIdentity {
  issuer: string;
  subject: string;
  email: string;
  name: string;
  emailVerified: boolean;
  zitadelOrgId: string;
  sessionId?: string;
}

export abstract class OidcBrokerClient {
  abstract createAuthorizationRequest(
    input: CreateOidcAuthorizationRequest,
  ): Promise<OidcAuthorizationRequest>;

  abstract validateCallback(
    input: ValidateOidcCallback,
  ): Promise<ValidatedOidcIdentity>;
}
