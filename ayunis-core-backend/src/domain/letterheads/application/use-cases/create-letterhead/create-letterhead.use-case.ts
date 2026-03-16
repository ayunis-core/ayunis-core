import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { Letterhead } from '../../../domain/letterhead.entity';
import { LetterheadInvalidPdfError } from '../../letterheads.errors';
import { CreateLetterheadCommand } from './create-letterhead.command';

@Injectable()
export class CreateLetterheadUseCase {
  private readonly logger = new Logger(CreateLetterheadUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
  ) {}

  async execute(command: CreateLetterheadCommand): Promise<Letterhead> {
    this.logger.log('Creating letterhead', { name: command.name });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    await this.validateSinglePagePdf(command.firstPagePdfBuffer, 'first page');

    if (command.continuationPagePdfBuffer) {
      await this.validateSinglePagePdf(
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

    const firstPagePath = this.buildStoragePath(
      orgId,
      letterhead.id,
      'first-page.pdf',
    );

    await this.uploadObjectUseCase.execute(
      new UploadObjectCommand(firstPagePath, command.firstPagePdfBuffer),
    );

    let continuationPagePath: string | null = null;
    if (command.continuationPagePdfBuffer) {
      continuationPagePath = this.buildStoragePath(
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

  private async validateSinglePagePdf(
    buffer: Buffer,
    label: string,
  ): Promise<void> {
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const pageCount = pdfDoc.getPageCount();
      if (pageCount !== 1) {
        throw new LetterheadInvalidPdfError(
          `${label} PDF must be exactly 1 page, got ${pageCount}`,
        );
      }
    } catch (error) {
      if (error instanceof LetterheadInvalidPdfError) {
        throw error;
      }
      throw new LetterheadInvalidPdfError(`${label} is not a valid PDF file`);
    }
  }

  private buildStoragePath(
    orgId: UUID,
    letterheadId: UUID,
    fileName: string,
  ): string {
    return `letterheads/${orgId}/${letterheadId}/${fileName}`;
  }
}
