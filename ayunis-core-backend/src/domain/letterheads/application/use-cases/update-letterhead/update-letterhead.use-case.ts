import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { LetterheadsRepository } from 'src/domain/letterheads/application/ports/letterheads-repository.port';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import {
  LetterheadNotFoundError,
  UnexpectedLetterheadError,
} from 'src/domain/letterheads/application/letterheads.errors';
import { LetterheadPdfService } from 'src/domain/letterheads/application/services/letterhead-pdf.service';
import { UpdateLetterheadCommand } from './update-letterhead.command';

@Injectable()
export class UpdateLetterheadUseCase {
  constructor(
    @InjectPinoLogger(UpdateLetterheadUseCase.name)
    private readonly logger: PinoLogger,
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly letterheadPdfService: LetterheadPdfService,
  ) {}

  async execute(command: UpdateLetterheadCommand): Promise<Letterhead> {
    this.logger.info(
      { letterheadId: command.letterheadId },
      'Updating letterhead',
    );

    try {
      return await this.updateLetterhead(command);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error as Error }, 'Error updating letterhead');
      throw new UnexpectedLetterheadError('Error updating letterhead', {
        error: error as Error,
      });
    }
  }

  private async updateLetterhead(
    command: UpdateLetterheadCommand,
  ): Promise<Letterhead> {
    const orgId = this.resolveOrgId();
    const existing = await this.letterheadsRepository.findById(
      orgId,
      command.letterheadId,
    );
    if (!existing) throw new LetterheadNotFoundError(command.letterheadId);
    const firstPageStoragePath = await this.replaceFirstPage(
      orgId,
      existing,
      command.firstPagePdfBuffer,
    );
    const continuationPageStoragePath = await this.resolveContinuationPage(
      orgId,
      existing,
      command,
    );
    return this.letterheadsRepository.save(
      this.buildUpdatedLetterhead(
        existing,
        command,
        firstPageStoragePath,
        continuationPageStoragePath,
      ),
    );
  }

  private resolveOrgId(): UUID {
    const orgId = this.contextService.get('orgId');
    if (!orgId) throw new UnauthorizedAccessError();
    return orgId;
  }

  private async replaceFirstPage(
    orgId: UUID,
    existing: Letterhead,
    buffer?: Buffer,
  ): Promise<string> {
    if (!buffer) return existing.firstPageStoragePath;
    const firstPage = await this.letterheadPdfService.prepareSinglePagePdf(
      buffer,
      'first page',
    );
    return this.uploadPdf(orgId, existing.id, 'first-page.pdf', firstPage);
  }

  private async resolveContinuationPage(
    orgId: UUID,
    existing: Letterhead,
    command: UpdateLetterheadCommand,
  ): Promise<string | null> {
    if (command.continuationPagePdfBuffer) {
      const continuationPage =
        await this.letterheadPdfService.prepareSinglePagePdf(
          command.continuationPagePdfBuffer,
          'continuation page',
        );
      return this.uploadPdf(
        orgId,
        existing.id,
        'continuation.pdf',
        continuationPage,
      );
    }
    if (!command.removeContinuationPage) {
      return existing.continuationPageStoragePath;
    }
    if (existing.continuationPageStoragePath) {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(existing.continuationPageStoragePath),
      );
    }
    return null;
  }

  private async uploadPdf(
    orgId: UUID,
    letterheadId: UUID,
    fileName: string,
    buffer: Buffer,
  ): Promise<string> {
    const path = this.letterheadPdfService.buildStoragePath(
      orgId,
      letterheadId,
      fileName,
    );
    await this.uploadObjectUseCase.execute(
      new UploadObjectCommand(path, buffer),
    );
    return path;
  }

  private buildUpdatedLetterhead(
    existing: Letterhead,
    command: UpdateLetterheadCommand,
    firstPageStoragePath: string,
    continuationPageStoragePath: string | null,
  ): Letterhead {
    return new Letterhead({
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
  }
}
