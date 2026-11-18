import {
  RecordingSearchScope,
  RecordingSearchTool,
} from './recording-search-tool.entity';

describe(RecordingSearchTool.name, () => {
  const tool = new RecordingSearchTool(new RecordingSearchScope(null));

  it('keeps every recording uploaded on the last day of a date-only range', () => {
    const { uploadedFrom, uploadedTo } = tool.validateParams({
      queries: ['Haushalt'],
      uploadedFrom: '2026-03-31',
      uploadedTo: '2026-03-31',
    });

    expect(uploadedFrom).toEqual(new Date('2026-03-31T00:00:00.000Z'));
    expect(uploadedTo).toEqual(new Date('2026-03-31T23:59:59.999Z'));
  });

  it('takes a date-time bound as given', () => {
    const { uploadedTo } = tool.validateParams({
      queries: ['Haushalt'],
      uploadedTo: '2026-03-31T12:00:00+02:00',
    });

    expect(uploadedTo).toEqual(new Date('2026-03-31T10:00:00.000Z'));
  });
});
