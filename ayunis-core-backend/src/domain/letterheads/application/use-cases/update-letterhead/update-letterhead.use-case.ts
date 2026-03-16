import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { Letterhead } from '../../../domain/letterhead.entity';
import {
  LetterheadNotFoundError,
  LetterheadInvalidPdfError,
} from '../../letterheads.errors';
import { UpdateLetterheadCommand } from './update-letterhead.command';

@Injectable()
export class UpdateLetterheadUseCase {
  private readonly logger = new Logger(UpdateLetterheadUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
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
      await this.validateSinglePagePdf(
        command.firstPagePdfBuffer,
        'first page',
      );
      firstPageStoragePath = this.buildStoragePath(
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
    if (command.continuationPagePdfBuffer !== undefined) {
      if (command.continuationPagePdfBuffer) {
        await this.validateSinglePagePdf(
          command.continuationPagePdfBuffer,
          'continuation page',
        );
        continuationPageStoragePath = this.buildStoragePath(
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
      } else {
        continuationPageStoragePath = null;
      }
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
