import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
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

  @HandleUnexpectedErrors(UnexpectedLetterheadError)
  async execute(command: CreateLetterheadCommand): Promise<Letterhead> {
    this.logger.log('Creating letterhead', { name: command.name });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    await this.validatePdfs(command);

    const letterheadId = randomUUID();

    const { firstPagePath, continuationPagePath } = await this.uploadPdfs(
      orgId,
      letterheadId,
      command,
    );

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
  }

  private async validatePdfs(command: CreateLetterheadCommand): Promise<void> {
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
  }

  private async uploadPdfs(
    orgId: UUID,
    letterheadId: UUID,
    command: CreateLetterheadCommand,
  ): Promise<{ firstPagePath: string; continuationPagePath: string | null }> {
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

    return { firstPagePath, continuationPagePath };
  }
}
