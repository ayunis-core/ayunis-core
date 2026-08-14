export interface ValidatedBackchannelLogout {
  issuer: string;
  subject?: string;
  sessionId?: string;
}

export abstract class OidcBrokerLogoutClient {
  abstract createEndSessionUrl(): string;

  abstract validateBackchannelLogoutToken(
    logoutToken: string,
  ): Promise<ValidatedBackchannelLogout>;
}
