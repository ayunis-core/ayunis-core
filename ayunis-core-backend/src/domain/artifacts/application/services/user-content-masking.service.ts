import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { createMaskRegistry } from 'src/common/anonymization/domain/apply-mask-replacements';
import { deanonymizeText } from 'src/common/anonymization/domain/deanonymize-text';
import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';
import { formatPiiToken } from 'src/common/anonymization/domain/pii-mask';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import {
  isFormulaCell,
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
  type SpreadsheetCell,
  type SpreadsheetContentV1,
} from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';
import {
  addDetectedValues,
  alignEdit,
  findKnownValues,
  HTML_TEXT_VALUES,
  overlapsAny,
  PLAIN_VALUES,
  replaceWithPlaceholders,
  type AlignedEdit,
  type PlaceholderReplacement,
  type ValueEncoding,
} from 'src/domain/artifacts/application/helpers/user-edit-placeholders';
import type { PlaceholderDraft } from 'src/domain/artifacts/application/models/placeholder-draft';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { AnonymizeTextForOrgUseCase } from 'src/domain/anonymization-settings/application/use-cases/anonymize-text-for-org/anonymize-text-for-org.use-case';
import { AnonymizeTextForOrgCommand } from 'src/domain/anonymization-settings/application/use-cases/anonymize-text-for-org/anonymize-text-for-org.command';

interface DetectionParams {
  /** The org whose anonymization whitelists filter the detected values. */
  orgId: UUID;
}

interface MaskUserContentParams extends DetectionParams {
  type: ArtifactType;
  /** Content already normalized by `prepareContentForWrite`. */
  content: string;
  /** The artifact being updated; absent when the content creates it. */
  currentArtifact?: Artifact;
}

/** The current version of the artifact being updated, with its dictionary. */
interface StoredContent {
  content: string;
  dictionary: PiiMask[];
}

const NOTHING_STORED: StoredContent = { content: '', dictionary: [] };

/**
 * Masks content a user saved into an anonymous artifact before it is stored,
 * so the model never reads a real value the user typed. The editor shows the
 * artifact with its real values; what the user left unchanged gets its
 * stored placeholders back, values of the artifact's dictionary in changed
 * text are found by exact lookup, and the rest of the changed text is masked
 * like a chat message, by detection with the org's whitelists, with new
 * entries in the artifact's dictionary. Failures propagate: the content
 * must not be stored unmasked.
 */
@Injectable()
export class UserContentMaskingService {
  private readonly logger = new Logger(UserContentMaskingService.name);

  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly anonymizeTextForOrgUseCase: AnonymizeTextForOrgUseCase,
  ) {}

  async mask(params: MaskUserContentParams): Promise<PlaceholderDraft> {
    this.logger.log(
      { type: params.type },
      'Masking user content of an anonymous artifact',
    );
    const stored = params.currentArtifact
      ? await this.findStoredContent(params.currentArtifact)
      : NOTHING_STORED;
    if (params.type === ArtifactType.SPREADSHEET) {
      return this.maskSpreadsheet(params, stored);
    }
    const encoding =
      params.type === ArtifactType.DOCUMENT ? HTML_TEXT_VALUES : PLAIN_VALUES;
    return this.maskEdit(params.content, stored, encoding, params);
  }

  /** Masks a new text, e.g. the title of an artifact created by a user. */
  maskText(text: string, params: DetectionParams): Promise<PlaceholderDraft> {
    return this.maskEdit(text, NOTHING_STORED, PLAIN_VALUES, params);
  }

  private async findStoredContent(artifact: Artifact): Promise<StoredContent> {
    const [version, dictionary] = await Promise.all([
      this.artifactsRepository.findVersion(
        artifact.id,
        artifact.currentVersionNumber,
      ),
      this.artifactsRepository.findPiiMasks(artifact.id),
    ]);
    return {
      content: version?.content ?? '',
      dictionary: dictionary.map((mask) => mask.toPiiMask()),
    };
  }

  private async maskEdit(
    text: string,
    stored: StoredContent,
    encoding: ValueEncoding,
    params: DetectionParams,
  ): Promise<PlaceholderDraft> {
    const edit = await alignEdit(
      stored.content,
      text,
      stored.dictionary,
      encoding,
    );
    const replacements = await this.findReplacements(
      edit,
      stored.dictionary,
      encoding,
      params,
    );
    return (dictionary) => {
      const registry = createMaskRegistry(dictionary);
      const value = replaceWithPlaceholders(edit.text, replacements, registry);
      return { value, newMasks: registry.newMasks };
    };
  }

  /** Known values by exact lookup; detection only for the changed text. */
  private async findReplacements(
    edit: AlignedEdit,
    dictionary: PiiMask[],
    encoding: ValueEncoding,
    params: DetectionParams & { skipDetection?: boolean },
  ): Promise<PlaceholderReplacement[]> {
    const known = findKnownValues(edit, dictionary, encoding);
    if (edit.changed.length === 0 || params.skipDetection) {
      return known;
    }
    const detected = (await this.detect(edit.text, params))
      .filter((range) => overlapsAny(range, edit.changed))
      .map((range) => ({
        ...range,
        value: encoding.decode(edit.text.slice(range.start, range.end)),
      }));
    return addDetectedValues(edit.text, known, detected, encoding);
  }

  /**
   * Masks the headers and string cells one by one, never the raw JSON, which
   * a value with quotes or backslashes would corrupt. A string the current
   * version stores, shown with its real values, gets its stored placeholders
   * back. Any other string is new: known values are looked up in it, and
   * detection masks the rest unless it is a formula, which detection would
   * break.
   */
  private async maskSpreadsheet(
    params: MaskUserContentParams,
    stored: StoredContent,
  ): Promise<PlaceholderDraft> {
    const data = parseSpreadsheetContent(params.content);
    const storedByShown = storedStringsByShownValue(stored);
    const replacementsByValue = new Map<string, PlaceholderReplacement[]>();
    for (const value of maskableStrings(data)) {
      if (storedByShown.has(value) || replacementsByValue.has(value)) continue;
      const edit = { text: value, changed: [{ start: 0, end: value.length }] };
      replacementsByValue.set(
        value,
        await this.findReplacements(edit, stored.dictionary, PLAIN_VALUES, {
          ...params,
          skipDetection: isFormulaCell(value),
        }),
      );
    }
    return (dictionary) => {
      const registry = createMaskRegistry(dictionary);
      const masked = (value: string) => {
        const replacements = replacementsByValue.get(value);
        return replacements
          ? replaceWithPlaceholders(value, replacements, registry)
          : (storedByShown.get(value) ?? value);
      };
      const content = serializeSpreadsheetContent({
        columns: data.columns.map(masked),
        rows: data.rows.map((row) =>
          row.map((cell) => (typeof cell === 'string' ? masked(cell) : cell)),
        ),
      });
      return { value: content, newMasks: registry.newMasks };
    };
  }

  /**
   * The org's anonymization filters detections by the whitelists and keeps
   * existing placeholders out of them; its own output is not used, only where
   * it found values.
   */
  private async detect(
    text: string,
    params: DetectionParams,
  ): Promise<PlaceholderReplacement[]> {
    const result = await this.anonymizeTextForOrgUseCase.execute(
      new AnonymizeTextForOrgCommand(text, params.orgId),
    );
    return result.replacements.map((replacement) => ({
      category: replacement.category,
      value: replacement.originalValue,
      start: replacement.start,
      end: replacement.end,
    }));
  }
}

/**
 * The current version's strings by how the editor shows them, with their
 * real values. Where two stored strings show the same, the masked one wins.
 */
function storedStringsByShownValue(stored: StoredContent): Map<string, string> {
  const byShown = new Map<string, string>();
  if (stored.content === '') return byShown;
  const values = new Map(
    stored.dictionary.map((mask) => [formatPiiToken(mask), mask.value]),
  );
  for (const value of maskableStrings(
    parseSpreadsheetContent(stored.content),
  )) {
    const shown = deanonymizeText(value, values);
    if (!byShown.has(shown) || shown !== value) byShown.set(shown, value);
  }
  return byShown;
}

function maskableStrings(data: SpreadsheetContentV1): string[] {
  return [...data.columns, ...data.rows.flat().filter(isString)].filter(
    (value) => value.trim() !== '',
  );
}

function isString(cell: SpreadsheetCell): cell is string {
  return typeof cell === 'string';
}
