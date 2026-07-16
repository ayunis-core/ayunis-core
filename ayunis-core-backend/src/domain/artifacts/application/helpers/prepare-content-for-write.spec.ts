import { ArtifactType } from '../../domain/value-objects/artifact-type.enum';
import { prepareContentForWrite } from './prepare-content-for-write';

describe('prepareContentForWrite', () => {
  it('sanitizes document HTML before returning it', () => {
    const content = '<p>Quarterly report</p><script>alert("xss")</script>';

    expect(prepareContentForWrite(ArtifactType.DOCUMENT, content)).toBe(
      '<p>Quarterly report</p>',
    );
  });

  it('normalizes spreadsheet content before returning it', () => {
    const content = JSON.stringify({
      format: 'spreadsheet-v1',
      columns: ['Department', 'Headcount'],
      rows: [['Finance'], ['Operations', 12, 'ignored extra cell']],
    });

    expect(
      JSON.parse(prepareContentForWrite(ArtifactType.SPREADSHEET, content)),
    ).toEqual({
      format: 'spreadsheet-v1',
      columns: ['Department', 'Headcount'],
      rows: [
        ['Finance', null],
        ['Operations', 12],
      ],
    });
  });

  it('preserves diagram content', () => {
    const content = 'graph TD; A[Start] --> B[Finish]';

    expect(prepareContentForWrite(ArtifactType.DIAGRAM, content)).toBe(content);
  });

  it('rejects an unsupported artifact type at runtime', () => {
    expect(() =>
      prepareContentForWrite('audio' as ArtifactType, 'raw content'),
    ).toThrow('Unsupported artifact type: audio');
  });
});
