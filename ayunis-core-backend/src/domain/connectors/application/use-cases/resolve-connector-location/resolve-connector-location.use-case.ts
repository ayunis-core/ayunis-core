import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { ConnectorSyncAdapterRegistry } from 'src/domain/connectors/application/connector-sync-adapter.registry';
import {
  ConnectorNotSetUpError,
  UnexpectedConnectorError,
} from 'src/domain/connectors/application/connectors.errors';
import type { ConnectorLocationResolution } from 'src/domain/connectors/application/models/connector-location-resolution';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import { ResolveConnectorLocationQuery } from './resolve-connector-location.query';

/**
 * Checks a pasted location URL through the current user's organization's
 * connector for the product before it is added as a synced location.
 */
@Injectable()
export class ResolveConnectorLocationUseCase {
  private readonly logger = new Logger(ResolveConnectorLocationUseCase.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly adapters: ConnectorSyncAdapterRegistry,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(
    query: ResolveConnectorLocationQuery,
  ): Promise<ConnectorLocationResolution> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ orgId, product: query.product }, 'execute');
    const connector = await this.connectorsRepository.findByOrgIdAndProduct(
      orgId,
      query.product,
    );
    const adapter = this.adapters.find(query.product);
    if (connector?.status !== ConnectorStatus.SET_UP || !adapter)
      throw new ConnectorNotSetUpError(query.product);
    const resolution = await adapter.resolveLocation(connector, query.location);
    this.logger.log(
      { orgId, product: query.product, outcome: resolution.outcome },
      'Resolved',
    );
    return resolution;
  }
}
