import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import { UnexpectedConnectorError } from 'src/domain/connectors/application/connectors.errors';
import { RemoveConnectionCommand } from './remove-connection.command';

/**
 * Deletes the setup and credentials but keeps the connector, so whatever
 * references it is reconnected when it is set up again. Removing a
 * connection that is not set up changes nothing.
 */
@Injectable()
export class RemoveConnectionUseCase {
  private readonly logger = new Logger(RemoveConnectionUseCase.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedConnectorError)
  async execute(command: RemoveConnectionCommand): Promise<void> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ orgId, product: command.product }, 'execute');

    await this.connectorsRepository.clearSetupAndCredentials(
      orgId,
      command.product,
    );
  }
}
