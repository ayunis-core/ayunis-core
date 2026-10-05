import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { UploadOrgObjectCommand } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { LetterheadsRepository } from 'src/domain/letterheads/application/ports/letterheads-repository.port';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import {
  LetterheadNotFoundError,
  LetterheadUpdateConflictError,
  UnexpectedLetterheadError,
} from 'src/domain/letterheads/application/letterheads.errors';
import { LetterheadPdfService } from 'src/domain/letterheads/application/services/letterhead-pdf.service';
import { UpdateLetterheadCommand } from './update-letterhead.command';
import { getRequiredOrgId } from 'src/common/context/required-context';

@Injectable()
export class UpdateLetterheadUseCase {
  private readonly logger = new Logger(UpdateLetterheadUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
    private readonly uploadOrgObjectUseCase: UploadOrgObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly letterheadPdfService: LetterheadPdfService,
  ) {}

  async execute(command: UpdateLetterheadCommand): Promise<Letterhead> {
    this.logger.log(
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
    let firstPageStoragePath = existing.firstPageStoragePath;
    let continuationPageStoragePath = existing.continuationPageStoragePath;
    try {
      firstPageStoragePath = await this.replaceFirstPage(
        orgId,
        existing,
        command.firstPagePdfBuffer,
      );
      continuationPageStoragePath = await this.resolveContinuationPage(
        orgId,
        existing,
        command,
      );
      const updated = await this.letterheadsRepository.updateIfUnchanged(
        this.buildUpdatedLetterhead(
          existing,
          command,
          firstPageStoragePath,
          continuationPageStoragePath,
        ),
        existing.updatedAt,
      );
      if (!updated) throw new LetterheadUpdateConflictError(existing.id);
      await this.cleanupSupersededPdfs(orgId, existing, updated);
      return updated;
    } catch (error) {
      await this.cleanupUncommittedPdfs(orgId, existing, [
        firstPageStoragePath,
        continuationPageStoragePath,
      ]);
      throw error;
    }
  }

  private resolveOrgId(): UUID {
    const orgId = getRequiredOrgId(this.contextService);
    return orgId;
  }

  private async replaceFirstPage(
    orgId: UUID,
    existing: Letterhead,
    buffer?: Buffer,
  ): Promise<string> {
    if (!buffer) return existing.firstPageStoragePath;
    await this.letterheadPdfService.validateSinglePagePdf(buffer, 'first page');
    return this.uploadPdf(orgId, existing.id, 'first-page.pdf', buffer);
  }

  private async resolveContinuationPage(
    orgId: UUID,
    existing: Letterhead,
    command: UpdateLetterheadCommand,
  ): Promise<string | null> {
    if (command.continuationPagePdfBuffer) {
      await this.letterheadPdfService.validateSinglePagePdf(
        command.continuationPagePdfBuffer,
        'continuation page',
      );
      return this.uploadPdf(
        orgId,
        existing.id,
        'continuation.pdf',
        command.continuationPagePdfBuffer,
      );
    }
    if (!command.removeContinuationPage) {
      return existing.continuationPageStoragePath;
    }
    return null;
  }

  private async cleanupSupersededPdfs(
    orgId: UUID,
    existing: Letterhead,
    updated: Letterhead,
  ): Promise<void> {
    const retained = new Set([
      updated.firstPageStoragePath,
      updated.continuationPageStoragePath,
    ]);
    const superseded = [
      existing.firstPageStoragePath,
      existing.continuationPageStoragePath,
    ].filter((path): path is string => Boolean(path) && !retained.has(path));
    await this.cleanupPdfs(orgId, existing.id, superseded);
  }

  private async cleanupUncommittedPdfs(
    orgId: UUID,
    existing: Letterhead,
    paths: Array<string | null>,
  ): Promise<void> {
    const committed = new Set([
      existing.firstPageStoragePath,
      existing.continuationPageStoragePath,
    ]);
    const uncommitted = paths.filter(
      (path): path is string => Boolean(path) && !committed.has(path),
    );
    await this.cleanupPdfs(orgId, existing.id, uncommitted);
  }

  private async cleanupPdfs(
    orgId: UUID,
    letterheadId: UUID,
    paths: string[],
  ): Promise<void> {
    await Promise.all(
      [...new Set(paths)].map((path) =>
        this.deletePdf(orgId, letterheadId, path),
      ),
    );
  }

  private async deletePdf(
    orgId: UUID,
    letterheadId: UUID,
    objectName: string,
  ): Promise<void> {
    try {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(objectName),
      );
    } catch (error) {
      this.logger.error(
        { err: error as Error, orgId, letterheadId, objectName },
        'Failed to clean up superseded letterhead PDF',
      );
    }
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
      `${randomUUID()}/${fileName}`,
    );
    await this.uploadOrgObjectUseCase.execute(
      new UploadOrgObjectCommand(orgId, path, buffer),
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
      updatedAt: new Date(
        Math.max(Date.now(), existing.updatedAt.getTime() + 1),
      ),
    });
  }
}
