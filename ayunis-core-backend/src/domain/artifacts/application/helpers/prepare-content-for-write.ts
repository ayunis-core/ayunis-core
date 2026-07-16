import { ArtifactType } from '../../domain/value-objects/artifact-type.enum';
import { sanitizeHtmlContent } from './sanitize-html-content';
import {
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
} from './spreadsheet-content';

export function prepareContentForWrite(
  type: ArtifactType,
  content: string,
): string {
  switch (type) {
    case ArtifactType.DOCUMENT:
      return sanitizeHtmlContent(content);
    case ArtifactType.SPREADSHEET:
      return serializeSpreadsheetContent(parseSpreadsheetContent(content));
    case ArtifactType.DIAGRAM:
      return content;
  }
}
