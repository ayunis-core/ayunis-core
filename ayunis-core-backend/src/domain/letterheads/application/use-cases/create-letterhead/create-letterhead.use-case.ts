import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { randomUUID, type UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { LetterheadsRepository } from 'src/domain/letterheads/application/ports/letterheads-repository.port';
import { UnexpectedLetterheadError } from 'src/domain/letterheads/application/letterheads.errors';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { LetterheadPdfService } from 'src/domain/letterheads/application/services/letterhead-pdf.service';
import { CreateLetterheadCommand } from './create-letterhead.command';

@Injectable()
export class CreateLetterheadUseCase {
  constructor(
    @InjectPinoLogger(CreateLetterheadUseCase.name)
    private readonly logger: PinoLogger,
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly letterheadPdfService: LetterheadPdfService,
  ) {}

  async execute(command: CreateLetterheadCommand): Promise<Letterhead> {
    this.logger.info('Creating letterhead');

    try {
      return await this.createLetterhead(command);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error as Error }, 'Error creating letterhead');
      throw new UnexpectedLetterheadError('Error creating letterhead', {
        error: error as Error,
      });
    }
  }

  private async createLetterhead(
    command: CreateLetterheadCommand,
  ): Promise<Letterhead> {
    const orgId = this.resolveOrgId();
    const pdfs = await this.preparePdfs(command);
    const letterheadId = randomUUID();
    const firstPagePath = this.letterheadPdfService.buildStoragePath(
      orgId,
      letterheadId,
      'first-page.pdf',
    );
    await this.uploadObjectUseCase.execute(
      new UploadObjectCommand(firstPagePath, pdfs.firstPage),
    );
    const continuationPagePath = await this.uploadContinuationPage(
      orgId,
      letterheadId,
      pdfs.continuationPage,
    );
    return this.letterheadsRepository.save(
      new Letterhead({
        id: letterheadId,
        orgId,
        name: command.name,
        description: command.description,
        firstPageStoragePath: firstPagePath,
        continuationPageStoragePath: continuationPagePath,
        firstPageMargins: command.firstPageMargins,
        continuationPageMargins: command.continuationPageMargins,
      }),
    );
  }

  private resolveOrgId(): UUID {
    const orgId = this.contextService.get('orgId');
    if (!orgId) throw new UnauthorizedAccessError();
    return orgId;
  }

  private async preparePdfs(
    command: CreateLetterheadCommand,
  ): Promise<{ firstPage: Buffer; continuationPage: Buffer | null }> {
    const firstPage = await this.letterheadPdfService.prepareSinglePagePdf(
      command.firstPagePdfBuffer,
      'first page',
    );
    if (!command.continuationPagePdfBuffer) {
      return { firstPage, continuationPage: null };
    }
    const continuationPage =
      await this.letterheadPdfService.prepareSinglePagePdf(
        command.continuationPagePdfBuffer,
        'continuation page',
      );
    return { firstPage, continuationPage };
  }

  private async uploadContinuationPage(
    orgId: UUID,
    letterheadId: UUID,
    buffer: Buffer | null | undefined,
  ): Promise<string | null> {
    if (!buffer) return null;
    const path = this.letterheadPdfService.buildStoragePath(
      orgId,
      letterheadId,
      'continuation.pdf',
    );
    await this.uploadObjectUseCase.execute(
      new UploadObjectCommand(path, buffer),
    );
    return path;
  }
}
