import { isLongRunningJob } from './processing-lane.helper';

const LARGE_FILE_BYTES = 20 * 1024 * 1024;

describe('isLongRunningJob', () => {
  it('keeps a small document in the standard lane', () => {
    expect(
      isLongRunningJob(
        { fileType: 'application/pdf', fileName: 'a.pdf', expectedSize: 4_096 },
        LARGE_FILE_BYTES,
      ),
    ).toBe(false);
  });

  it('sends a document at or above the size threshold to the long-running lane', () => {
    const job = { fileType: 'application/pdf', fileName: 'a.pdf' };

    expect(
      isLongRunningJob(
        { ...job, expectedSize: LARGE_FILE_BYTES - 1 },
        LARGE_FILE_BYTES,
      ),
    ).toBe(false);
    expect(
      isLongRunningJob(
        { ...job, expectedSize: LARGE_FILE_BYTES },
        LARGE_FILE_BYTES,
      ),
    ).toBe(true);
  });

  it('sends every recording to the long-running lane, since a small file can hold hours of speech', () => {
    expect(
      isLongRunningJob(
        { fileType: 'audio/mpeg', fileName: 'rede.mp3', expectedSize: 4_096 },
        LARGE_FILE_BYTES,
      ),
    ).toBe(true);
  });

  it('keeps a job queued before sizes were recorded in the standard lane', () => {
    expect(
      isLongRunningJob(
        { fileType: 'application/pdf', fileName: 'a.pdf' },
        LARGE_FILE_BYTES,
      ),
    ).toBe(false);
  });
});
