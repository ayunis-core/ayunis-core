import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { DocumentExportPort } from '../../ports/document-export.port';
import { ExportArtifactCommand } from './export-artifact.command';
import {
  ArtifactNotFoundError,
  ArtifactVersionNotFoundError,
} from '../../artifacts.errors';

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
  ) {}

  async execute(command: ExportArtifactCommand): Promise<ExportResult> {
    this.logger.log('Exporting artifact', {
      artifactId: command.artifactId,
      format: command.format,
    });

    const artifact = await this.artifactsRepository.findByIdWithVersions(
      command.artifactId,
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

    const safeTitle = artifact.title.replace(/[^a-zA-Z0-9-_ ]/g, '');

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

    const buffer = await this.documentExportPort.exportToPdf(
      currentVersion.content,
    );
    return {
      buffer,
      fileName: `${safeTitle}.pdf`,
      mimeType: 'application/pdf',
    };
  }
}
