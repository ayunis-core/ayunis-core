import { MIME_TYPES } from 'src/common/util/file-type';
import { FileType } from 'src/domain/sources/domain/source-type.enum';
import { fileTypeFromMimeType } from './source-file-type.helpers';

describe('fileTypeFromMimeType', () => {
  it.each([MIME_TYPES.CSV, MIME_TYPES.XLSX, MIME_TYPES.XLS, MIME_TYPES.ODS])(
    'stores table MIME %s as a text file',
    (mime) => {
      expect(fileTypeFromMimeType(mime)).toBe(FileType.TXT);
    },
  );
});
