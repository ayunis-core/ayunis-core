import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { Letterhead } from '../../../domain/letterhead.entity';
import { LetterheadPdfService } from '../../services/letterhead-pdf.service';
import { CreateLetterheadCommand } from './create-letterhead.command';

@Injectable()
export class CreateLetterheadUseCase {
  private readonly logger = new Logger(CreateLetterheadUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly letterheadPdfService: LetterheadPdfService,
  ) {}

  async execute(command: CreateLetterheadCommand): Promise<Letterhead> {
    this.logger.log('Creating letterhead', { name: command.name });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    await this.letterheadPdfService.validateSinglePagePdf(
      command.firstPagePdfBuffer,
      'first page',
    );

    if (command.continuationPagePdfBuffer) {
      await this.letterheadPdfService.validateSinglePagePdf(
        command.continuationPagePdfBuffer,
        'continuation page',
      );
    }

    const letterhead = new Letterhead({
      orgId,
      name: command.name,
      description: command.description,
      firstPageStoragePath: '',
      continuationPageStoragePath: null,
      firstPageMargins: command.firstPageMargins,
      continuationPageMargins: command.continuationPageMargins,
    });

    const firstPagePath = this.letterheadPdfService.buildStoragePath(
      orgId,
      letterhead.id,
      'first-page.pdf',
    );

    await this.uploadObjectUseCase.execute(
      new UploadObjectCommand(firstPagePath, command.firstPagePdfBuffer),
    );

    let continuationPagePath: string | null = null;
    if (command.continuationPagePdfBuffer) {
      continuationPagePath = this.letterheadPdfService.buildStoragePath(
        orgId,
        letterhead.id,
        'continuation.pdf',
      );
      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(
          continuationPagePath,
          command.continuationPagePdfBuffer,
        ),
      );
    }

    const letterheadWithPaths = new Letterhead({
      ...letterhead,
      firstPageStoragePath: firstPagePath,
      continuationPageStoragePath: continuationPagePath,
    });

    return this.letterheadsRepository.save(letterheadWithPaths);
  }
}
