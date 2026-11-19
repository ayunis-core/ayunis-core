import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import {
  ConnectorNotSetUpError,
  UnexpectedConnectorError,
} from 'src/domain/connectors/application/connectors.errors';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import { FindSetUpConnectorQuery } from './find-set-up-connector.query';

/**
 * The ID of the current user's organization's connector for a product, for
 * referencing it. Never its setup or credentials.
 */
@Injectable()
export class FindSetUpConnectorUseCase {
  private readonly logger = new Logger(FindSetUpConnectorUseCase.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(query: FindSetUpConnectorQuery): Promise<{ id: UUID }> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ orgId, product: query.product }, 'execute');
    const connector = await this.connectorsRepository.findByOrgIdAndProduct(
      orgId,
      query.product,
    );
    if (connector?.status !== ConnectorStatus.SET_UP)
      throw new ConnectorNotSetUpError(query.product);
    return { id: connector.id };
  }
}
