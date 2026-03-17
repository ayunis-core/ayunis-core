import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import {
  DocumentExportPort,
  LetterheadConfig,
} from '../../ports/document-export.port';
import { ExportArtifactCommand } from './export-artifact.command';
import {
  ArtifactNotFoundError,
  ArtifactVersionNotFoundError,
  UnexpectedArtifactError,
} from '../../artifacts.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { LetterheadsRepository } from 'src/domain/letterheads/application/ports/letterheads-repository.port';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import type { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';

export interface ExportResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class ExportArtifactUseCase {
  private readonly logger = new Logger(ExportArtifactUseCase.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly documentExportPort: DocumentExportPort,
    private readonly contextService: ContextService,
    private readonly letterheadsRepository: LetterheadsRepository,
    private readonly objectStoragePort: ObjectStoragePort,
  ) {}

  async execute(command: ExportArtifactCommand): Promise<ExportResult> {
    this.logger.log('Exporting artifact', {
      artifactId: command.artifactId,
      format: command.format,
    });

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const artifact = await this.artifactsRepository.findByIdWithVersions(
        command.artifactId,
        userId,
      );
      if (!artifact) {
        throw new ArtifactNotFoundError(command.artifactId);
      }

      const currentVersion = artifact.versions.find(
        (v) => v.versionNumber === artifact.currentVersionNumber,
      );
      if (!currentVersion) {
        throw new ArtifactVersionNotFoundError(
          command.artifactId,
          artifact.currentVersionNumber,
        );
      }

      const safeTitle =
        artifact.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'artifact';

      if (command.format === 'docx') {
        const buffer = await this.documentExportPort.exportToDocx(
          currentVersion.content,
        );
        return {
          buffer,
          fileName: `${safeTitle}.docx`,
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
      }

      const letterheadConfig = await this.resolveLetterhead(artifact);

      const buffer = await this.documentExportPort.exportToPdf(
        currentVersion.content,
        letterheadConfig,
      );
      return {
        buffer,
        fileName: `${safeTitle}.pdf`,
        mimeType: 'application/pdf',
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('exportArtifactUnexpectedError', {
        artifactId: command.artifactId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedArtifactError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private async resolveLetterhead(artifact: {
    letterheadId: UUID | null;
  }): Promise<LetterheadConfig | undefined> {
    if (!artifact.letterheadId) {
      return undefined;
    }

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      return undefined;
    }

    const letterhead = await this.letterheadsRepository.findById(
      orgId,
      artifact.letterheadId,
    );
    if (!letterhead) {
      this.logger.warn(
        `Letterhead ${artifact.letterheadId} not found, exporting without background`,
      );
      return undefined;
    }

    return this.downloadLetterheadPdfs(letterhead);
  }

  private async downloadLetterheadPdfs(
    letterhead: Letterhead,
  ): Promise<LetterheadConfig> {
    const firstPagePdf = await this.downloadPdf(
      letterhead.firstPageStoragePath,
    );

    const continuationPagePdf = letterhead.continuationPageStoragePath
      ? await this.downloadPdf(letterhead.continuationPageStoragePath)
      : undefined;

    return {
      firstPagePdf,
      continuationPagePdf,
      firstPageMargins: letterhead.firstPageMargins,
      continuationPageMargins: letterhead.continuationPageMargins,
    };
  }

  private async downloadPdf(storagePath: string): Promise<Buffer> {
    const storageUrl = new StorageUrl(storagePath, 'default');
    const stream = await this.objectStoragePort.download(storageUrl);
    return this.streamToBuffer(stream);
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
