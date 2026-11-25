import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';
import { OparlDocumentsRepository } from 'src/domain/oparl/application/ports/oparl-documents.repository';
import { HasOparlVectorsOfModelQuery } from './has-oparl-vectors-of-model.query';

/** Whether any chunk of any mirror holds a vector of the catalog embedding model. */
@Injectable()
export class HasOparlVectorsOfModelUseCase {
  private readonly logger = new Logger(HasOparlVectorsOfModelUseCase.name);

  constructor(private readonly documents: OparlDocumentsRepository) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(query: HasOparlVectorsOfModelQuery): Promise<boolean> {
    this.logger.log({ embeddingModelId: query.embeddingModelId }, 'execute');
    return this.documents.hasVectorsOf(query.embeddingModelId);
  }
}
