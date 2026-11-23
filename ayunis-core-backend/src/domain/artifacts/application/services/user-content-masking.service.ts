import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { applyMaskReplacements } from 'src/common/anonymization/domain/apply-mask-replacements';
import type { PiiDetection } from 'src/common/anonymization/domain/pii-detection';
import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import {
  isFormulaCell,
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
  type SpreadsheetCell,
  type SpreadsheetContentV1,
} from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';
import type { PlaceholderDraft } from 'src/domain/artifacts/application/models/placeholder-draft';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';

interface DetectionParams {
  /** The chat whose anonymization (whitelists and dictionary) detects values. */
  threadId: UUID;
  orgId: UUID;
}

interface MaskUserContentParams extends DetectionParams {
  type: ArtifactType;
  /** Content already normalized by `prepareContentForWrite`. */
  content: string;
  /** The artifact being updated; absent when the content creates it. */
  currentArtifact?: Artifact;
}

/**
 * Masks content a user saved into an anonymous artifact before it is stored,
 * so the model never reads a real value the user typed. Values are detected
 * through the chat's anonymization, as in a chat message, and replaced with
 * the artifact's own placeholders. Failures propagate: the content must not
 * be stored unmasked.
 */
@Injectable()
export class UserContentMaskingService {
  private readonly logger = new Logger(UserContentMaskingService.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
  ) {}

  async mask(params: MaskUserContentParams): Promise<PlaceholderDraft> {
    this.logger.log(
      { threadId: params.threadId, type: params.type },
      'Masking user content of an anonymous artifact',
    );
    if (params.type === ArtifactType.SPREADSHEET) {
      return this.maskSpreadsheet(params);
    }
    return this.maskText(params.content, params);
  }

  /** Masks a text as a whole, e.g. a document, a diagram or a title. */
  async maskText(
    text: string,
    params: DetectionParams,
  ): Promise<PlaceholderDraft> {
    const detections = await this.detect(text, params);
    return (dictionary) => {
      const { anonymizedText, newMasks } = applyMaskReplacements(
        text,
        detections,
        dictionary,
      );
      return { value: anonymizedText, newMasks };
    };
  }

  /**
   * Masks the headers and string cells one by one, never the raw JSON, which
   * a value with quotes or backslashes would corrupt. Formulas stay as they
   * are. Strings the current version already stores are skipped, so a save
   * costs one detection per string the user actually typed.
   */
  private async maskSpreadsheet(
    params: MaskUserContentParams,
  ): Promise<PlaceholderDraft> {
    const data = parseSpreadsheetContent(params.content);
    const storedStrings = await this.findStoredStrings(params.currentArtifact);
    const detectionsByValue = new Map<string, PiiDetection[]>();
    for (const value of maskableStrings(data)) {
      if (storedStrings.has(value) || detectionsByValue.has(value)) continue;
      detectionsByValue.set(value, await this.detect(value, params));
    }
    return (dictionary) => {
      const newMasks: PiiMask[] = [];
      const maskedByValue = new Map<string, string>();
      for (const [value, detections] of detectionsByValue) {
        const result = applyMaskReplacements(value, detections, [
          ...dictionary,
          ...newMasks,
        ]);
        maskedByValue.set(value, result.anonymizedText);
        newMasks.push(...result.newMasks);
      }
      const masked = (value: string) => maskedByValue.get(value) ?? value;
      const content = serializeSpreadsheetContent({
        columns: data.columns.map(masked),
        rows: data.rows.map((row) =>
          row.map((cell) => (isMaskableCell(cell) ? masked(cell) : cell)),
        ),
      });
      return { value: content, newMasks };
    };
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

  /**
   * The chat's anonymization filters detections by the whitelists and keeps
   * existing placeholders out of them; its own output is not used, only where
   * it found values.
   */
  private async detect(
    text: string,
    params: DetectionParams,
  ): Promise<PiiDetection[]> {
    const result = await this.anonymizeTextForThreadUseCase.execute(
      new AnonymizeTextForThreadCommand(text, params.orgId, params.threadId, {
        source: 'other',
      }),
    );
    return result.replacements.map((replacement) => ({
      entityType: replacement.entityType,
      category: replacement.category,
      text: replacement.originalValue,
      start: replacement.start,
      end: replacement.end,
      score: replacement.score,
    }));
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
