import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import {
  isFormulaCell,
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
  type SpreadsheetCell,
  type SpreadsheetContentV1,
} from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';

interface MaskUserContentParams {
  thread: Pick<Thread, 'id' | 'isAnonymous'>;
  orgId: UUID;
  type: ArtifactType;
  /** Content already normalized by `prepareContentForWrite`. */
  content: string;
  /** The artifact being updated; absent when the content creates it. */
  currentArtifact?: Artifact;
}

/**
 * Masks content a user saved into an artifact of an anonymous chat before it
 * is stored, through the chat's mask dictionary, so the model never reads a
 * real value the user typed. Failures propagate: the content must not be
 * stored unmasked.
 */
@Injectable()
export class UserContentMaskingService {
  private readonly logger = new Logger(UserContentMaskingService.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
  ) {}

  async mask(params: MaskUserContentParams): Promise<string> {
    if (!params.thread.isAnonymous) {
      return params.content;
    }
    this.logger.log(
      { threadId: params.thread.id, type: params.type },
      'Masking user content of an anonymous chat',
    );
    if (params.type === ArtifactType.SPREADSHEET) {
      return this.maskSpreadsheet(params);
    }
    return this.maskText(params.content, params);
  }

  /**
   * Masks the headers and string cells one by one, never the raw JSON, which
   * a value with quotes or backslashes would corrupt. Formulas stay as they
   * are. Strings the current version already stores are skipped, so a save
   * costs one detection per string the user actually typed.
   */
  private async maskSpreadsheet(
    params: MaskUserContentParams,
  ): Promise<string> {
    const data = parseSpreadsheetContent(params.content);
    const storedStrings = await this.findStoredStrings(params.currentArtifact);
    const maskedByValue = new Map<string, string>();
    for (const value of maskableStrings(data)) {
      if (storedStrings.has(value) || maskedByValue.has(value)) continue;
      maskedByValue.set(value, await this.maskText(value, params));
    }
    const masked = (value: string) => maskedByValue.get(value) ?? value;
    return serializeSpreadsheetContent({
      columns: data.columns.map(masked),
      rows: data.rows.map((row) =>
        row.map((cell) => (isMaskableCell(cell) ? masked(cell) : cell)),
      ),
    });
  }

  private async findStoredStrings(artifact?: Artifact): Promise<Set<string>> {
    if (!artifact) {
      return new Set();
    }
    const version = await this.artifactsRepository.findVersion(
      artifact.id,
      artifact.currentVersionNumber,
    );
    return new Set(
      version ? maskableStrings(parseSpreadsheetContent(version.content)) : [],
    );
  }

  private async maskText(
    text: string,
    params: MaskUserContentParams,
  ): Promise<string> {
    const result = await this.anonymizeTextForThreadUseCase.execute(
      new AnonymizeTextForThreadCommand(text, params.orgId, params.thread.id, {
        source: 'other',
      }),
    );
    return result.anonymizedText;
  }
}

function isMaskableCell(cell: SpreadsheetCell): cell is string {
  return typeof cell === 'string' && !isFormulaCell(cell);
}

function maskableStrings(data: SpreadsheetContentV1): string[] {
  return [...data.columns, ...data.rows.flat().filter(isMaskableCell)].filter(
    (value) => value.trim() !== '',
  );
}
