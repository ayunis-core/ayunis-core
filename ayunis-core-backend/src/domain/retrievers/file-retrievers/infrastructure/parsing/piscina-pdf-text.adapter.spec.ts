import Piscina from 'piscina';
import { FileRetrievalFailedError } from '../../application/file-retriever.errors';
import { PiscinaPdfTextAdapter } from './piscina-pdf-text.adapter';

const runMock = jest.fn();
const destroyMock = jest.fn();

jest.mock('piscina', () =>
  jest.fn().mockImplementation(() => ({
    run: runMock,
    destroy: destroyMock,
  })),
);

describe('PiscinaPdfTextAdapter', () => {
  let adapter: PiscinaPdfTextAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PiscinaPdfTextAdapter();
  });

  it.each([
    ['countPages', () => adapter.countPages(Buffer.from('pdf'))],
    ['extractPageTexts', () => adapter.extractPageTexts(Buffer.from('pdf'))],
  ] as const)(
    'runs %s as a named worker task with an abort signal',
    async (taskName, invoke) => {
      runMock.mockResolvedValue([]);

      await invoke();

      const options = runMock.mock.calls[0][1] as {
        name: string;
        signal: AbortSignal;
      };
      expect(options.name).toBe(taskName);
      expect(options.signal).toBeInstanceOf(AbortSignal);
    },
  );

  it('caps the worker heap so a hostile PDF cannot OOM the process', async () => {
    runMock.mockResolvedValue(2);

    await adapter.countPages(Buffer.from('pdf'));

    const poolOptions = (Piscina as unknown as jest.Mock).mock.calls[0][0] as {
      resourceLimits?: { maxOldGenerationSizeMb?: number };
    };
    expect(poolOptions.resourceLimits?.maxOldGenerationSizeMb).toBe(512);
  });

  it('maps an aborted task to FileRetrievalFailedError', async () => {
    const abortError = new Error('The task has been aborted');
    Object.defineProperty(abortError, 'name', { value: 'AbortError' });
    runMock.mockRejectedValue(abortError);

    await expect(
      adapter.extractPageTexts(Buffer.from('pdf')),
    ).rejects.toBeInstanceOf(FileRetrievalFailedError);
  });

  it('rethrows non-abort errors unchanged', async () => {
    const parseError = new Error('corrupt pdf');
    runMock.mockRejectedValue(parseError);

    await expect(adapter.countPages(Buffer.from('pdf'))).rejects.toBe(
      parseError,
    );
  });
});
