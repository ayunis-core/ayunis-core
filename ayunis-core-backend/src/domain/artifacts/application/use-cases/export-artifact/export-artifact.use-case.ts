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
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { FindLetterheadQuery } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.query';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
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
    private readonly findLetterheadUseCase: FindLetterheadUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
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

      let buffer: Buffer;
      try {
        buffer = await this.documentExportPort.exportToPdf(
          currentVersion.content,
          letterheadConfig,
        );
      } catch (error) {
        if (!letterheadConfig) throw error;
        const reason = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Letterhead compositing failed, exporting without letterhead: ${reason}`,
        );
        buffer = await this.documentExportPort.exportToPdf(
          currentVersion.content,
        );
      }
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

    try {
      const letterhead = await this.findLetterheadUseCase.execute(
        new FindLetterheadQuery({ letterheadId: artifact.letterheadId }),
      );
      return await this.downloadLetterheadPdfs(letterhead);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to resolve letterhead ${artifact.letterheadId}, exporting without background: ${reason}`,
      );
      return undefined;
    }
  }

  private async downloadLetterheadPdfs(
    letterhead: Letterhead,
  ): Promise<LetterheadConfig> {
    const [firstPagePdf, continuationPagePdf] = await Promise.all([
      this.downloadPdf(letterhead.firstPageStoragePath),
      letterhead.continuationPageStoragePath
        ? this.downloadPdf(letterhead.continuationPageStoragePath)
        : undefined,
    ]);

    return {
      firstPagePdf,
      continuationPagePdf,
      firstPageMargins: letterhead.firstPageMargins,
      continuationPageMargins: letterhead.continuationPageMargins,
    };
  }

  private async downloadPdf(storagePath: string): Promise<Buffer> {
    const stream = await this.downloadObjectUseCase.execute(
      new DownloadObjectCommand(storagePath),
    );
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
