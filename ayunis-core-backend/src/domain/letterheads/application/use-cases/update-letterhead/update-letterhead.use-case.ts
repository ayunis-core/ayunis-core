import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { Letterhead } from '../../../domain/letterhead.entity';
import { LetterheadNotFoundError } from '../../letterheads.errors';
import { LetterheadPdfService } from '../../services/letterhead-pdf.service';
import { UpdateLetterheadCommand } from './update-letterhead.command';

@Injectable()
export class UpdateLetterheadUseCase {
  private readonly logger = new Logger(UpdateLetterheadUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly letterheadPdfService: LetterheadPdfService,
  ) {}

  async execute(command: UpdateLetterheadCommand): Promise<Letterhead> {
    this.logger.log('Updating letterhead', {
      letterheadId: command.letterheadId,
    });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    const existing = await this.letterheadsRepository.findById(
      orgId,
      command.letterheadId,
    );
    if (!existing) {
      throw new LetterheadNotFoundError(command.letterheadId);
    }

    let firstPageStoragePath = existing.firstPageStoragePath;
    if (command.firstPagePdfBuffer) {
      await this.letterheadPdfService.validateSinglePagePdf(
        command.firstPagePdfBuffer,
        'first page',
      );
      firstPageStoragePath = this.letterheadPdfService.buildStoragePath(
        orgId,
        existing.id,
        'first-page.pdf',
      );
      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(
          firstPageStoragePath,
          command.firstPagePdfBuffer,
        ),
      );
    }

    let continuationPageStoragePath = existing.continuationPageStoragePath;
    if (command.continuationPagePdfBuffer) {
      await this.letterheadPdfService.validateSinglePagePdf(
        command.continuationPagePdfBuffer,
        'continuation page',
      );
      continuationPageStoragePath = this.letterheadPdfService.buildStoragePath(
        orgId,
        existing.id,
        'continuation.pdf',
      );
      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(
          continuationPageStoragePath,
          command.continuationPagePdfBuffer,
        ),
      );
    } else if (command.removeContinuationPage) {
      if (existing.continuationPageStoragePath) {
        await this.deleteObjectUseCase.execute(
          new DeleteObjectCommand(existing.continuationPageStoragePath),
        );
      }
      continuationPageStoragePath = null;
    }

    const updated = new Letterhead({
      id: existing.id,
      orgId: existing.orgId,
      name: command.name ?? existing.name,
      description:
        command.description !== undefined
          ? command.description
          : existing.description,
      firstPageStoragePath,
      continuationPageStoragePath,
      firstPageMargins: command.firstPageMargins ?? existing.firstPageMargins,
      continuationPageMargins:
        command.continuationPageMargins ?? existing.continuationPageMargins,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    return this.letterheadsRepository.save(updated);
  }
}
