import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { UnexpectedLetterheadError } from '../../letterheads.errors';
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

    try {
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

      const letterheadId = randomUUID();

      const firstPagePath = this.letterheadPdfService.buildStoragePath(
        orgId,
        letterheadId,
        'first-page.pdf',
      );

      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(firstPagePath, command.firstPagePdfBuffer),
      );

      let continuationPagePath: string | null = null;
      if (command.continuationPagePdfBuffer) {
        continuationPagePath = this.letterheadPdfService.buildStoragePath(
          orgId,
          letterheadId,
          'continuation.pdf',
        );
        await this.uploadObjectUseCase.execute(
          new UploadObjectCommand(
            continuationPagePath,
            command.continuationPagePdfBuffer,
          ),
        );
      }

      const letterhead = new Letterhead({
        id: letterheadId,
        orgId,
        name: command.name,
        description: command.description,
        firstPageStoragePath: firstPagePath,
        continuationPageStoragePath: continuationPagePath,
        firstPageMargins: command.firstPageMargins,
        continuationPageMargins: command.continuationPageMargins,
      });

      return await this.letterheadsRepository.save(letterhead);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error creating letterhead', {
        error: error as Error,
      });
      throw new UnexpectedLetterheadError('Error creating letterhead', {
        error: error as Error,
      });
    }
  }
}
