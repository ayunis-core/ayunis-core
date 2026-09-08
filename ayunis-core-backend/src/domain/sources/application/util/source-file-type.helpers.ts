import { MIME_TYPES } from 'src/common/util/file-type';
import { FileType } from 'src/domain/sources/domain/source-type.enum';

/**
 * Canonical upload MIME type → the {@link FileType} persisted on a file
 * source. Every source-creation path resolves through this one map, so a newly
 * accepted format cannot be recorded by one entry point and rejected by
 * another. Keys are the canonical MIMEs produced by `getCanonicalMimeType`.
 */
const FILE_TYPE_BY_MIME_TYPE: Record<string, FileType> = {
  [MIME_TYPES.PDF]: FileType.PDF,
  [MIME_TYPES.DOCX]: FileType.DOCX,
  [MIME_TYPES.PPTX]: FileType.PPTX,
  [MIME_TYPES.ODT]: FileType.ODT,
  [MIME_TYPES.ODP]: FileType.ODP,
  [MIME_TYPES.TXT]: FileType.TXT,
  [MIME_TYPES.EML]: FileType.EML,
  [MIME_TYPES.MP3]: FileType.AUDIO,
  [MIME_TYPES.M4A]: FileType.AUDIO,
  [MIME_TYPES.WAV]: FileType.AUDIO,
  [MIME_TYPES.WEBM]: FileType.AUDIO,
};

/** Returns undefined for MIME types that are not a text/file source. */
export function fileTypeFromMimeType(mimeType: string): FileType | undefined {
  return FILE_TYPE_BY_MIME_TYPE[mimeType];
}
