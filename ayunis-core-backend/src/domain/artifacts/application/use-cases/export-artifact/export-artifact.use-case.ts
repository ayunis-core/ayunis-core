import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import {
  DocumentExportPort,
  LetterheadConfig,
} from '../../ports/document-export.port';
import {
  SpreadsheetExportPort,
  type SpreadsheetExportInput,
} from '../../ports/spreadsheet-export.port';
import {
  ExportArtifactCommand,
  type ExportFormat,
} from './export-artifact.command';
import {
  ArtifactNotFoundError,
  ArtifactNotExportableError,
  ArtifactVersionNotFoundError,
  UnexpectedArtifactError,
} from '../../artifacts.errors';
import {
  Artifact,
  DocumentArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import {
  isFormulaCell,
  mapSpreadsheetStrings,
  parseSpreadsheetContent,
  type SpreadsheetContentV1,
} from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { FindLetterheadQuery } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.query';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import type { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import { GetThreadPiiMasksQuery } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.query';
import { deanonymizeText } from 'src/common/anonymization/domain/deanonymize-text';

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
    private readonly spreadsheetExportPort: SpreadsheetExportPort,
    private readonly contextService: ContextService,
    private readonly findLetterheadUseCase: FindLetterheadUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly getThreadPiiMasksUseCase: GetThreadPiiMasksUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(command: ExportArtifactCommand): Promise<ExportResult> {
    this.logger.log('Exporting artifact', {
      artifactId: command.artifactId,
      format: command.format,
    });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const artifact = await this.loadExportableArtifact(
      command.artifactId,
      userId,
      command.format,
    );
    const version = this.requireVersion(artifact, command.versionNumber);
    const safeTitle = this.buildSafeTitle(artifact.title);

    if (artifact instanceof SpreadsheetArtifact) {
      const data = await this.prepareSpreadsheetExportData(
        artifact.threadId,
        version.content,
      );
      return command.format === 'xlsx'
        ? await this.exportXlsx(data, safeTitle)
        : await this.exportCsv(data, safeTitle);
    }

    const content = await this.deanonymizeContent(
      artifact.threadId,
      version.content,
    );

    if (command.format === 'docx') {
      return await this.exportDocx(content, safeTitle);
    }

    return await this.exportPdf(artifact, content, safeTitle);
  }

  private async loadExportableArtifact(
    artifactId: UUID,
    userId: UUID,
    format: ExportFormat,
  ): Promise<DocumentArtifact | SpreadsheetArtifact> {
    const artifact = await this.artifactsRepository.findByIdWithVersions(
      artifactId,
      userId,
    );
    if (!artifact) {
      throw new ArtifactNotFoundError(artifactId);
    }

    const isSpreadsheetFormat = format === 'xlsx' || format === 'csv';
    if (isSpreadsheetFormat) {
      if (!(artifact instanceof SpreadsheetArtifact)) {
        throw new ArtifactNotExportableError(artifact.type, { format });
      }
      return artifact;
    }

    if (!(artifact instanceof DocumentArtifact)) {
      throw new ArtifactNotExportableError(artifact.type, { format });
    }
    return artifact;
  }

  private requireVersion(artifact: Artifact, versionNumber?: number) {
    const requestedVersionNumber =
      versionNumber ?? artifact.currentVersionNumber;
    const version = artifact.versions.find(
      (candidate) => candidate.versionNumber === requestedVersionNumber,
    );
    if (!version) {
      throw new ArtifactVersionNotFoundError(
        artifact.id,
        requestedVersionNumber,
      );
    }
    return version;
  }

  /**
   * Replaces `{{pii:...}}` tokens in the artifact content with the thread's
   * original values so the exported file is de-anonymized. Stored content stays
   * masked; this resolution happens only at export egress.
   */
  private async deanonymizeContent(
    threadId: UUID,
    content: string,
  ): Promise<string> {
    const tokenToValue = await this.resolveTokenMap(threadId);
    return tokenToValue ? deanonymizeText(content, tokenToValue) : content;
  }

  /**
   * Spreadsheet content is JSON — token replacement must happen per header and
   * per string cell after parsing, never on the raw JSON string, because PII
   * values containing quotes or backslashes would corrupt it.
   */
  private async prepareSpreadsheetExportData(
    threadId: UUID,
    content: string,
  ): Promise<SpreadsheetExportInput> {
    const storedData = parseSpreadsheetContent(content);
    const tokenToValue = await this.resolveTokenMap(threadId);
    const grid: SpreadsheetContentV1 = tokenToValue
      ? mapSpreadsheetStrings(storedData, (value) =>
          deanonymizeText(value, tokenToValue),
        )
      : storedData;

    return {
      grid,
      formulaCells: storedData.rows.map((row) => row.map(isFormulaCell)),
    };
  }

  private async resolveTokenMap(
    threadId: UUID,
  ): Promise<Map<string, string> | null> {
    const masks = await this.getThreadPiiMasksUseCase.execute(
      new GetThreadPiiMasksQuery(threadId),
    );
    if (masks.length === 0) {
      return null;
    }
    return new Map(masks.map((mask) => [mask.token, mask.value]));
  }

  private buildSafeTitle(title: string): string {
    return title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'artifact';
  }

  private async exportDocx(
    content: string,
    safeTitle: string,
  ): Promise<ExportResult> {
    const buffer = await this.documentExportPort.exportToDocx(content);
    return {
      buffer,
      fileName: `${safeTitle}.docx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private async exportXlsx(
    data: SpreadsheetExportInput,
    safeTitle: string,
  ): Promise<ExportResult> {
    const buffer = await this.spreadsheetExportPort.exportToXlsx(data);
    return {
      buffer,
      fileName: `${safeTitle}.xlsx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async exportCsv(
    data: SpreadsheetExportInput,
    safeTitle: string,
  ): Promise<ExportResult> {
    const csv = await this.spreadsheetExportPort.exportToCsv(data);
    return {
      buffer: Buffer.from(csv, 'utf8'),
      fileName: `${safeTitle}.csv`,
      mimeType: 'text/csv',
    };
  }

  private async exportPdf(
    artifact: DocumentArtifact,
    content: string,
    safeTitle: string,
  ): Promise<ExportResult> {
    const letterheadConfig = await this.resolveLetterhead(artifact);

    let buffer: Buffer;
    try {
      buffer = await this.documentExportPort.exportToPdf(
        content,
        letterheadConfig,
      );
    } catch (error) {
      if (!letterheadConfig) throw error;
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Letterhead compositing failed, exporting without letterhead: ${reason}`,
      );
      buffer = await this.documentExportPort.exportToPdf(content);
    }
    return {
      buffer,
      fileName: `${safeTitle}.pdf`,
      mimeType: 'application/pdf',
    };
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
