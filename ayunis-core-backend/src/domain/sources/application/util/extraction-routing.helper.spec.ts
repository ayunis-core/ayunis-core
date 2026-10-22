import { usesExtractionService } from './extraction-routing.helper';

describe('usesExtractionService', () => {
  it('keeps every type in the backend while the service URL is unset', () => {
    expect(usesExtractionService({ url: undefined }, 'pdf')).toBe(false);
  });

  it('routes only PDF to the service once it is configured', () => {
    const config = { url: 'https://extraction:8000' };

    expect(usesExtractionService(config, 'pdf')).toBe(true);
    expect(usesExtractionService(config, 'docx')).toBe(false);
    expect(usesExtractionService(config, 'eml')).toBe(false);
    expect(usesExtractionService(config, 'txt')).toBe(false);
    expect(usesExtractionService(config, 'xlsx')).toBe(false);
    expect(usesExtractionService(config, 'mp3')).toBe(false);
  });
});
