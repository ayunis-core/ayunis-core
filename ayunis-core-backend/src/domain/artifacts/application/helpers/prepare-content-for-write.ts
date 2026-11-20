import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { normalizeBpmnContent } from './bpmn-content-format';
import { sanitizeHtmlContent } from './sanitize-html-content';
import {
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
} from './spreadsheet-content-format';

type ContentNormalizer = (content: string) => string | Promise<string>;

const identity: ContentNormalizer = (content) => content;

const CONTENT_NORMALIZERS = {
  [ArtifactType.DOCUMENT]: sanitizeHtmlContent,
  [ArtifactType.SPREADSHEET]: (content: string) =>
    serializeSpreadsheetContent(parseSpreadsheetContent(content)),
  [ArtifactType.DIAGRAM]: identity,
  [ArtifactType.BPMN]: normalizeBpmnContent,
} satisfies Record<ArtifactType, ContentNormalizer>;

export async function prepareContentForWrite(
  type: ArtifactType,
  content: string,
): Promise<string> {
  if (!Object.prototype.hasOwnProperty.call(CONTENT_NORMALIZERS, type)) {
    throw new Error(`Unsupported artifact type: ${String(type)}`);
  }

  return await CONTENT_NORMALIZERS[type](content);
}
