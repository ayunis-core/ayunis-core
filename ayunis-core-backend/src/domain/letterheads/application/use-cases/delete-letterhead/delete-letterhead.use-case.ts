import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { LetterheadNotFoundError } from '../../letterheads.errors';
import { DeleteLetterheadCommand } from './delete-letterhead.command';

@Injectable()
export class DeleteLetterheadUseCase {
  private readonly logger = new Logger(DeleteLetterheadUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
  ) {}

  async execute(command: DeleteLetterheadCommand): Promise<void> {
    this.logger.log('Deleting letterhead', {
      letterheadId: command.letterheadId,
    });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    const letterhead = await this.letterheadsRepository.findById(
      orgId,
      command.letterheadId,
    );
    if (!letterhead) {
      throw new LetterheadNotFoundError(command.letterheadId);
    }

    // Delete DB record first — orphaned storage files are benign,
    // but a DB record pointing to deleted storage paths causes runtime errors.
    await this.letterheadsRepository.delete(orgId, command.letterheadId);

    await this.deleteObjectUseCase.execute(
      new DeleteObjectCommand(letterhead.firstPageStoragePath),
    );

    if (letterhead.continuationPageStoragePath) {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(letterhead.continuationPageStoragePath),
      );
    }
  }
}
