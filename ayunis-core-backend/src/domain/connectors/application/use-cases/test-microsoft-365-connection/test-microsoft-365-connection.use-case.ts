import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import {
  ConnectorNotSetUpError,
  UnexpectedConnectorError,
} from 'src/domain/connectors/application/connectors.errors';
import type { Microsoft365ConnectionTestResult } from 'src/domain/connectors/application/models/microsoft-365-connection-test-result';
import { Microsoft365ConnectionTestService } from 'src/domain/connectors/application/services/microsoft-365-connection-test.service';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';

@Injectable()
export class TestMicrosoft365ConnectionUseCase {
  private readonly logger = new Logger(TestMicrosoft365ConnectionUseCase.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectionTest: Microsoft365ConnectionTestService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(): Promise<Microsoft365ConnectionTestResult> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ orgId }, 'execute');

    const connector = await this.connectorsRepository.findByOrgIdAndProduct(
      orgId,
      ConnectorProduct.MICROSOFT_365,
    );
    if (connector?.status !== ConnectorStatus.SET_UP) {
      throw new ConnectorNotSetUpError(ConnectorProduct.MICROSOFT_365);
    }
    return this.connectionTest.test(connector);
  }
}
