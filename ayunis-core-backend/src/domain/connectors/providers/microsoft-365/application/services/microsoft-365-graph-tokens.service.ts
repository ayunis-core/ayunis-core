import { Injectable } from '@nestjs/common';
import { ConnectorNotSetUpError } from 'src/domain/connectors/application/connectors.errors';
import { EntraResource } from 'src/domain/connectors/providers/microsoft-365/application/ports/entra-app-token.port';
import type { Connector } from 'src/domain/connectors/domain/connector.entity';
import { Microsoft365AppTokenService } from './microsoft-365-app-token.service';
import { GraphRequestRejectedError } from './sharepoint/sharepoint-graph.helpers';

/** A token is renewed this long before it expires. */
const EXPIRY_MARGIN_MS = 5 * 60_000;

/**
 * Microsoft Graph tokens of Microsoft 365 connectors for syncing, kept until
 * shortly before they expire, so a sync does not ask Entra for one per file.
 * Changed credentials get a new one.
 */
@Injectable()
export class Microsoft365GraphTokensService {
  /** By connector ID, with the credentials the token was issued for. */
  private readonly tokens = new Map<
    string,
    { credentials: string; accessToken: string; expiresAt: Date }
  >();

  constructor(private readonly appTokens: Microsoft365AppTokenService) {}

  /**
   * Runs `work` with the connector's token; `null` while the connector is not
   * set up or Entra rejects it. A token Graph refused (401) is not kept.
   */
  async withAccessToken<T>(
    connector: Connector,
    work: (accessToken: string) => Promise<T>,
  ): Promise<T | null> {
    const accessToken = await this.accessToken(connector);
    if (!accessToken) return null;
    try {
      return await work(accessToken);
    } catch (error) {
      if (
        error instanceof GraphRequestRejectedError &&
        error.httpStatus === 401
      )
        this.tokens.delete(connector.id);
      throw error;
    }
  }

  private async accessToken(connector: Connector): Promise<string | null> {
    const credentials = credentialsOf(connector);
    const cached = this.tokens.get(connector.id);
    if (
      cached?.credentials === credentials &&
      cached.expiresAt.getTime() - EXPIRY_MARGIN_MS > Date.now()
    )
      return cached.accessToken;
    this.tokens.delete(connector.id);
    const token = await this.appTokens
      .requestToken(connector, EntraResource.MICROSOFT_GRAPH)
      .catch((error: unknown) => {
        if (error instanceof ConnectorNotSetUpError) return null;
        throw error;
      });
    if (token?.status !== 'issued') return null;
    this.tokens.set(connector.id, {
      credentials,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
    });
    return token.accessToken;
  }
}

function credentialsOf(connector: Connector): string {
  return JSON.stringify([connector.setup, connector.encryptedCredentials]);
}
