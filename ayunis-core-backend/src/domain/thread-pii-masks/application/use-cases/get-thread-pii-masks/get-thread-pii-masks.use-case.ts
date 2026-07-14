import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ThreadPiiMaskRepository } from '../../ports/thread-pii-mask.repository';
import { UnexpectedThreadPiiMasksError } from '../../thread-pii-masks.errors';
import type { ThreadPiiMask } from '../../../domain/thread-pii-mask.entity';
import type { GetThreadPiiMasksQuery } from './get-thread-pii-masks.query';

@Injectable()
export class GetThreadPiiMasksUseCase {
  private readonly logger = new Logger(GetThreadPiiMasksUseCase.name);

  constructor(private readonly repository: ThreadPiiMaskRepository) {}

  @HandleUnexpectedErrors(UnexpectedThreadPiiMasksError)
  async execute(query: GetThreadPiiMasksQuery): Promise<ThreadPiiMask[]> {
    this.logger.debug('Getting thread PII masks', {
      threadId: query.threadId,
    });

    return this.repository.findByThreadId(query.threadId);
  }
}
