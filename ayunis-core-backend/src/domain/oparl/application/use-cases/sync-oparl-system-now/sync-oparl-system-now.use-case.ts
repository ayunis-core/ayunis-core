import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OparlSyncJobsPort } from 'src/domain/oparl/application/ports/oparl-sync-jobs.port';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import {
  OparlSystemNotFoundError,
  UnexpectedOparlError,
} from 'src/domain/oparl/application/oparl.errors';
import { SyncOparlSystemNowCommand } from './sync-oparl-system-now.command';

/** Queues a run of the system; nothing more while one is queued or running. */
@Injectable()
export class SyncOparlSystemNowUseCase {
  private readonly logger = new Logger(SyncOparlSystemNowUseCase.name);

  constructor(
    private readonly systems: OparlSystemsRepository,
    private readonly jobs: OparlSyncJobsPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(command: SyncOparlSystemNowCommand): Promise<void> {
    this.logger.log({ systemId: command.systemId }, 'Syncing OParl system now');
    const system = await this.systems.findById(command.systemId);
    if (!system) throw new OparlSystemNotFoundError(command.systemId);
    await this.jobs.enqueue([system.id]);
  }
}
