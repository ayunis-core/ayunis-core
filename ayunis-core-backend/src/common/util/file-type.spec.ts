import { detectFileType, MIME_TYPES } from './file-type';

describe('detectFileType', () => {
  describe('PDF detection', () => {
    it('returns "pdf" when MIME type is application/pdf', () => {
      expect(detectFileType(MIME_TYPES.PDF, 'document.pdf')).toBe('pdf');
    });

    it('returns "pdf" when extension is .pdf but MIME type is application/octet-stream', () => {
      expect(detectFileType('application/octet-stream', 'document.pdf')).toBe(
        'pdf',
      );
    });

    it('returns "pdf" when extension is .pdf but MIME type is empty string', () => {
      expect(detectFileType('', 'document.pdf')).toBe('pdf');
    });

    it('returns "pdf" when extension is .PDF (case insensitive)', () => {
      expect(detectFileType('application/octet-stream', 'DOCUMENT.PDF')).toBe(
        'pdf',
      );
    });
  });

  describe('DOCX detection', () => {
    it('returns "docx" when MIME type is correct', () => {
      expect(detectFileType(MIME_TYPES.DOCX, 'document.docx')).toBe('docx');
    });

    it('returns "docx" when extension is .docx but MIME type is incorrect', () => {
      expect(detectFileType('application/octet-stream', 'document.docx')).toBe(
        'docx',
      );
    });

    it('returns "docx" when MIME type is correct but extension is different', () => {
      expect(detectFileType(MIME_TYPES.DOCX, 'document.txt')).toBe('docx');
    });
  });

  describe('PPTX detection', () => {
    it('returns "pptx" when MIME type is correct', () => {
      expect(detectFileType(MIME_TYPES.PPTX, 'presentation.pptx')).toBe('pptx');
    });

    it('returns "pptx" when extension is .pptx but MIME type is incorrect', () => {
      expect(
        detectFileType('application/octet-stream', 'presentation.pptx'),
      ).toBe('pptx');
    });

    it('returns "pptx" when MIME type is correct but extension is different', () => {
      expect(detectFileType(MIME_TYPES.PPTX, 'presentation.txt')).toBe('pptx');
    });
  });

  describe('XLSX/XLS detection', () => {
    it('returns "xlsx" when MIME type is correct', () => {
      expect(detectFileType(MIME_TYPES.XLSX, 'spreadsheet.xlsx')).toBe('xlsx');
    });

    it('returns "xls" when MIME type is XLS and extension is .xls', () => {
      expect(detectFileType(MIME_TYPES.XLS, 'spreadsheet.xls')).toBe('xls');
    });

    it('returns "xlsx" when MIME type is XLS but extension is .xlsx', () => {
      expect(detectFileType(MIME_TYPES.XLS, 'spreadsheet.xlsx')).toBe('xlsx');
    });

    it('returns "xlsx" when extension is .xlsx but MIME type is application/octet-stream', () => {
      expect(
        detectFileType('application/octet-stream', 'spreadsheet.xlsx'),
      ).toBe('xlsx');
    });

    it('returns "xlsx" when extension is .XLSX (case insensitive)', () => {
      expect(
        detectFileType('application/octet-stream', 'SPREADSHEET.XLSX'),
      ).toBe('xlsx');
    });

    it('returns "xls" when extension is .xls but MIME type is application/octet-stream', () => {
      expect(
        detectFileType('application/octet-stream', 'spreadsheet.xls'),
      ).toBe('xls');
    });

    it('returns "xls" when extension is .XLS (case insensitive)', () => {
      expect(
        detectFileType('application/octet-stream', 'SPREADSHEET.XLS'),
      ).toBe('xls');
    });
  });

  describe('CSV detection', () => {
    it('returns "csv" when MIME type is text/csv', () => {
      expect(detectFileType(MIME_TYPES.CSV, 'data.csv')).toBe('csv');
    });

    it('returns "csv" when MIME type is application/vnd.ms-excel but extension is .csv', () => {
      expect(detectFileType(MIME_TYPES.XLS, 'data.csv')).toBe('csv');
    });
  });

  describe('Unknown handling', () => {
    it('returns "unknown" for unsupported MIME types and extensions', () => {
      expect(detectFileType('text/plain', 'file.txt')).toBe('unknown');
    });

    it('returns "unknown" for image files', () => {
      expect(detectFileType('image/png', 'image.png')).toBe('unknown');
    });

    it('returns "unknown" when both MIME type and extension are empty', () => {
      expect(detectFileType('', '')).toBe('unknown');
    });
  });
});
