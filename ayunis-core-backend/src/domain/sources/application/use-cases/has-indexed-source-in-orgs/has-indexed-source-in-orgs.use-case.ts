import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { HasIndexedSourceInOrgsQuery } from './has-indexed-source-in-orgs.query';

@Injectable()
export class HasIndexedSourceInOrgsUseCase {
  private readonly logger = new Logger(HasIndexedSourceInOrgsUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(query: HasIndexedSourceInOrgsQuery): Promise<boolean> {
    this.logger.log({ orgCount: query.orgIds.length }, 'execute');
    if (query.orgIds.length === 0) {
      return false;
    }
    return this.sourceRepository.hasIndexedSourceInOrgs(query.orgIds);
  }
}
