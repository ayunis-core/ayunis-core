import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { UploadOrgObjectCommand } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { LetterheadsRepository } from 'src/domain/letterheads/application/ports/letterheads-repository.port';
import { UnexpectedLetterheadError } from 'src/domain/letterheads/application/letterheads.errors';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { LetterheadPdfService } from 'src/domain/letterheads/application/services/letterhead-pdf.service';
import { CreateLetterheadCommand } from './create-letterhead.command';
import { getRequiredOrgId } from 'src/common/context/required-context';

@Injectable()
export class CreateLetterheadUseCase {
  private readonly logger = new Logger(CreateLetterheadUseCase.name);

  constructor(
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly contextService: ContextService,
    private readonly uploadOrgObjectUseCase: UploadOrgObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly letterheadPdfService: LetterheadPdfService,
  ) {}

  async execute(command: CreateLetterheadCommand): Promise<Letterhead> {
    this.logger.log('Creating letterhead');

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
    await this.validatePdfs(command);
    const letterheadId = randomUUID();
    const firstPagePath = this.letterheadPdfService.buildStoragePath(
      orgId,
      letterheadId,
      'first-page.pdf',
    );
    const uploadedPaths: string[] = [];
    try {
      await this.uploadOrgObjectUseCase.execute(
        new UploadOrgObjectCommand(
          orgId,
          firstPagePath,
          command.firstPagePdfBuffer,
        ),
      );
      uploadedPaths.push(firstPagePath);
      const continuationPagePath = await this.uploadContinuationPage(
        orgId,
        letterheadId,
        command.continuationPagePdfBuffer,
      );
      if (continuationPagePath) uploadedPaths.push(continuationPagePath);
      return await this.saveLetterhead(
        command,
        orgId,
        letterheadId,
        firstPagePath,
        continuationPagePath,
      );
    } catch (error) {
      await this.cleanupUploadedPdfs(orgId, letterheadId, uploadedPaths);
      throw error;
    }
  }

  private saveLetterhead(
    command: CreateLetterheadCommand,
    orgId: UUID,
    letterheadId: UUID,
    firstPagePath: string,
    continuationPagePath: string | null,
  ): Promise<Letterhead> {
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
    const orgId = getRequiredOrgId(this.contextService);
    return orgId;
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
    await this.uploadOrgObjectUseCase.execute(
      new UploadOrgObjectCommand(orgId, path, buffer),
    );
    return path;
  }

  private async cleanupUploadedPdfs(
    orgId: UUID,
    letterheadId: UUID,
    paths: string[],
  ): Promise<void> {
    await Promise.all(
      paths.map((path) => this.deletePdf(orgId, letterheadId, path)),
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
        'Failed to clean up uncommitted letterhead PDF',
      );
    }
  }
}
