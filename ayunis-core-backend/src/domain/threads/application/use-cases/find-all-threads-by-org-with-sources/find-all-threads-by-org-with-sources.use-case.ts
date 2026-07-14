import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindAllThreadsByOrgWithSourcesQuery } from './find-all-threads-by-org-with-sources.query';
import { UnexpectedThreadError } from '../../threads.errors';

@Injectable()
export class FindAllThreadsByOrgWithSourcesUseCase {
  private readonly logger = new Logger(
    FindAllThreadsByOrgWithSourcesUseCase.name,
  );

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  @HandleUnexpectedErrors(UnexpectedThreadError)
  async execute(query: FindAllThreadsByOrgWithSourcesQuery): Promise<Thread[]> {
    this.logger.log('execute', { orgId: query.orgId });
    return this.threadsRepository.findAllByOrgIdWithSources(query.orgId);
  }
}
