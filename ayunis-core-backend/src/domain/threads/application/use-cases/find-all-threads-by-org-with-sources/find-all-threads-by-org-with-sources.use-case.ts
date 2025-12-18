import { Injectable, Logger } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindAllThreadsByOrgWithSourcesQuery } from './find-all-threads-by-org-with-sources.query';

@Injectable()
export class FindAllThreadsByOrgWithSourcesUseCase {
  private readonly logger = new Logger(
    FindAllThreadsByOrgWithSourcesUseCase.name,
  );

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(query: FindAllThreadsByOrgWithSourcesQuery): Promise<Thread[]> {
    this.logger.log('execute', { orgId: query.orgId });
    return this.threadsRepository.findAllByOrgIdWithSources(query.orgId);
  }
}
