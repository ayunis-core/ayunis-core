import { ArtifactType } from '../../domain/value-objects/artifact-type.enum';
import { sanitizeHtmlContent } from './sanitize-html-content';
import {
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
} from './spreadsheet-content-format';

type ContentNormalizer = (content: string) => string;

const identity: ContentNormalizer = (content) => content;

const CONTENT_NORMALIZERS = {
  [ArtifactType.DOCUMENT]: sanitizeHtmlContent,
  [ArtifactType.SPREADSHEET]: (content: string) =>
    serializeSpreadsheetContent(parseSpreadsheetContent(content)),
  [ArtifactType.DIAGRAM]: identity,
} satisfies Record<ArtifactType, ContentNormalizer>;

export function prepareContentForWrite(
  type: ArtifactType,
  content: string,
): string {
  if (!Object.prototype.hasOwnProperty.call(CONTENT_NORMALIZERS, type)) {
    throw new Error(`Unsupported artifact type: ${String(type)}`);
  }

  return CONTENT_NORMALIZERS[type](content);
}
