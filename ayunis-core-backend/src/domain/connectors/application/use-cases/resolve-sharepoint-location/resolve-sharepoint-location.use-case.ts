import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { ProviderRequestRejectedError } from 'src/common/errors/provider.errors';
import {
  ConnectorConnectionFailedError,
  ConnectorNotSetUpError,
  UnexpectedConnectorError,
} from 'src/domain/connectors/application/connectors.errors';
import {
  type SharePointResolution,
  SharePointResolutionOutcome,
} from 'src/domain/connectors/application/models/sharepoint-location';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import { Microsoft365GraphTokensService } from 'src/domain/connectors/application/services/microsoft-365-graph-tokens.service';
import {
  GraphStop,
  GraphStopReason,
} from 'src/domain/connectors/application/services/sharepoint/sharepoint-graph.helpers';
import { SharePointLocationResolver } from 'src/domain/connectors/application/services/sharepoint/sharepoint-location-resolver.service';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import { readMicrosoft365Setup } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection';
import { parseSharePointUrl } from 'src/domain/connectors/domain/microsoft-365/sharepoint-url';
import { ResolveSharePointLocationQuery } from './resolve-sharepoint-location.query';
import type { SharePointLocationResolution } from './resolve-sharepoint-location.result';

/**
 * Checks a pasted SharePoint URL (site, library or folder) through the
 * current user's organization's Microsoft 365 connector before it is added
 * as a synced location: found, or not granted with the command for the
 * Microsoft 365 admin that grants it, or not found.
 */
@Injectable()
export class ResolveSharePointLocationUseCase {
  private readonly logger = new Logger(ResolveSharePointLocationUseCase.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly tokens: Microsoft365GraphTokensService,
    private readonly resolver: SharePointLocationResolver,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(
    query: ResolveSharePointLocationQuery,
  ): Promise<SharePointLocationResolution> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ orgId }, 'execute');
    const connector = await this.connectorsRepository.findByOrgIdAndProduct(
      orgId,
      ConnectorProduct.MICROSOFT_365,
    );
    const setup = connector && readMicrosoft365Setup(connector.setup);
    if (connector?.status !== ConnectorStatus.SET_UP || !setup)
      throw new ConnectorNotSetUpError(ConnectorProduct.MICROSOFT_365);
    const url = parseSharePointUrl(query.url);
    if (!url) return { outcome: SharePointResolutionOutcome.UNSUPPORTED_URL };
    const resolution = await this.tokens
      .withAccessToken(connector, (accessToken) =>
        this.resolver.resolve(accessToken, url, setup.clientId),
      )
      .catch(rethrowThrottling);
    if (!resolution)
      throw new ConnectorConnectionFailedError(ConnectorProduct.MICROSOFT_365);
    this.logger.log({ orgId, outcome: resolution.outcome }, 'Resolved');
    return publicResolution(resolution);
  }
}

function rethrowThrottling(error: unknown): never {
  if (error instanceof GraphStop && error.reason === GraphStopReason.THROTTLED)
    throw new ProviderRequestRejectedError({
      provider: 'microsoft_graph',
      upstreamStatus: 429,
      retryAfterMs: Math.max(0, (error.retryAt?.getTime() ?? 0) - Date.now()),
    });
  throw error;
}

function publicResolution(
  resolution: SharePointResolution,
): SharePointLocationResolution {
  if (resolution.outcome !== SharePointResolutionOutcome.FOUND)
    return resolution;
  const { kind, name, webUrl } = resolution.target;
  return { outcome: resolution.outcome, kind, name, location: webUrl };
}
