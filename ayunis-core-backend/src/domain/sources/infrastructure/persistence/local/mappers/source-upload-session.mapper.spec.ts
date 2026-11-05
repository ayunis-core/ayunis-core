import { buildUploadSession } from 'src/domain/sources/application/testing/source-upload.fixtures';
import { SourceUploadSessionMapper } from './source-upload-session.mapper';

describe('SourceUploadSessionMapper', () => {
  const mapper = new SourceUploadSessionMapper();
  const sourceId = '55555555-5555-5555-5555-555555555555' as const;

  it('keeps pending uploads without an object identity', () => {
    const session = buildUploadSession();
    const result = mapper.toDomain(mapper.toRecord(session));
    expect(result.expectedETag).toBeNull();
  });

  it('preserves one verified identity for every source from an upload', () => {
    const session = buildUploadSession({
      expectedETag: 'verified-object',
      sources: [{ sourceId, sheetName: 'Budget' }],
    });
    const record = mapper.toRecord(session);
    expect(record.expectedETag).toBe('verified-object');
    expect(mapper.toDomain(record)).toMatchObject({
      expectedETag: 'verified-object',
      sources: [{ sourceId, sheetName: 'Budget' }],
    });
  });

  it('preserves the verified identity of sessions written before the refactor', () => {
    const record = mapper.toRecord(buildUploadSession());
    record.sources = [
      { sourceId, sheetName: null, expectedETag: 'old-object' },
    ];
    expect(mapper.toDomain(record)).toMatchObject({
      expectedETag: 'old-object',
      sources: [{ sourceId, sheetName: null }],
    });
    expect(mapper.toDomain(record).sources[0]).not.toHaveProperty(
      'expectedETag',
    );
  });

  it('uses the session identity when legacy source references also exist', () => {
    const record = mapper.toRecord(
      buildUploadSession({ expectedETag: 'current' }),
    );
    record.sources = [
      { sourceId, sheetName: null, expectedETag: 'old-object' },
    ];
    expect(mapper.toDomain(record).expectedETag).toBe('current');
  });
});
