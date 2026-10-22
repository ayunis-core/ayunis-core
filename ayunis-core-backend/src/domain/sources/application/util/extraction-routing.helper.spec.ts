import { usesExtractionService } from './extraction-routing.helper';

describe('usesExtractionService', () => {
  it('keeps every type in the backend while the service URL is unset', () => {
    for (const fileType of ['pdf', 'docx', 'eml', 'msg', 'txt'] as const) {
      expect(usesExtractionService({ url: undefined }, fileType)).toBe(false);
    }
  });

  it('routes documents, Office formats, email and text to the service once it is configured', () => {
    const config = { url: 'https://extraction:8000' };

    for (const fileType of [
      'pdf',
      'docx',
      'pptx',
      'odt',
      'odp',
      'eml',
      'msg',
      'txt',
    ] as const) {
      expect(usesExtractionService(config, fileType)).toBe(true);
    }
  });

  it('keeps audio and spreadsheets in the backend', () => {
    const config = { url: 'https://extraction:8000' };

    for (const fileType of [
      'xlsx',
      'xls',
      'ods',
      'csv',
      'mp3',
      'm4a',
      'wav',
      'webm',
      'unknown',
    ] as const) {
      expect(usesExtractionService(config, fileType)).toBe(false);
    }
  });
});
