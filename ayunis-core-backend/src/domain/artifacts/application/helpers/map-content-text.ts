import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import {
  mapSpreadsheetStrings,
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
} from './spreadsheet-content-format';

/**
 * Applies a text mapping to an artifact's content: documents and diagrams as
 * a whole, spreadsheets per header and string cell, never the raw JSON.
 */
export function mapContentText(
  type: ArtifactType,
  content: string,
  map: (text: string) => string,
): string {
  if (type !== ArtifactType.SPREADSHEET) {
    return map(content);
  }
  return serializeSpreadsheetContent(
    mapSpreadsheetStrings(parseSpreadsheetContent(content), map),
  );
}
