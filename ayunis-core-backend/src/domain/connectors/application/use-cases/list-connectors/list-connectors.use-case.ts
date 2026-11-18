import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import { UnexpectedConnectorError } from 'src/domain/connectors/application/connectors.errors';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import type { ConnectorOverview } from './list-connectors.result';

/** Every available product, whether or not the organization has set it up. */
@Injectable()
export class ListConnectorsUseCase {
  private readonly logger = new Logger(ListConnectorsUseCase.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(): Promise<ConnectorOverview[]> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ orgId }, 'execute');

    const connectors = await this.connectorsRepository.findAllByOrgId(orgId);
    const statusByProduct = new Map(
      connectors.map((connector) => [connector.product, connector.status]),
    );

    return Object.values(ConnectorProduct).map((product) => ({
      product,
      status: statusByProduct.get(product) ?? ConnectorStatus.NOT_SET_UP,
    }));
  }
}
