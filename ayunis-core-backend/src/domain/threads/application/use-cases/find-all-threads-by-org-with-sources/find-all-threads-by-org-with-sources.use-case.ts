import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindAllThreadsByOrgWithSourcesQuery } from './find-all-threads-by-org-with-sources.query';

@Injectable()
export class FindAllThreadsByOrgWithSourcesUseCase {
  constructor(
    @InjectPinoLogger(FindAllThreadsByOrgWithSourcesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
  ) {}

  async execute(query: FindAllThreadsByOrgWithSourcesQuery): Promise<Thread[]> {
    this.logger.info({ orgId: query.orgId }, 'execute');
    return this.threadsRepository.findAllByOrgIdWithSources(query.orgId);
  }
}
