import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import { UnexpectedConnectorError } from 'src/domain/connectors/application/connectors.errors';
import {
  type Microsoft365ConnectorOverview,
  toMicrosoft365ConnectorOverview,
} from 'src/domain/connectors/providers/microsoft-365/application/models/microsoft-365-connector-overview';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';

@Injectable()
export class GetMicrosoft365ConnectorUseCase {
  private readonly logger = new Logger(GetMicrosoft365ConnectorUseCase.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(): Promise<Microsoft365ConnectorOverview> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ orgId }, 'execute');

    const connector = await this.connectorsRepository.findByOrgIdAndProduct(
      orgId,
      ConnectorProduct.MICROSOFT_365,
    );
    return toMicrosoft365ConnectorOverview(connector);
  }
}
