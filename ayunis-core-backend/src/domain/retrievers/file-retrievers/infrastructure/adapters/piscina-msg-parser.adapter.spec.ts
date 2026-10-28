import { UnprocessableDocumentError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { PiscinaMsgParserAdapter } from './piscina-msg-parser.adapter';

const runMock = jest.fn();

jest.mock('piscina', () =>
  jest.fn().mockImplementation(() => ({ run: runMock, destroy: jest.fn() })),
);

function errorWith(fields: { name?: string; code?: string }): Error {
  return Object.assign(new Error('worker failure'), fields);
}

describe('PiscinaMsgParserAdapter', () => {
  let adapter: PiscinaMsgParserAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PiscinaMsgParserAdapter();
  });

  it('returns the text extracted by the worker', async () => {
    runMock.mockResolvedValue({ text: 'Subject: Hallo' });

    await expect(adapter.extractText(Buffer.from('msg'))).resolves.toBe(
      'Subject: Hallo',
    );
    const options = runMock.mock.calls[0][1] as { signal: AbortSignal };
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects a parse error reported by the worker as unprocessable', async () => {
    runMock.mockResolvedValue({ error: 'Unsupported file type!' });

    await expect(
      adapter.extractText(Buffer.from('msg')),
    ).rejects.toBeInstanceOf(UnprocessableDocumentError);
  });

  it.each([
    ['a parse that times out', errorWith({ name: 'AbortError' })],
    [
      'a parse that exhausts the worker heap',
      errorWith({ code: 'ERR_WORKER_OUT_OF_MEMORY' }),
    ],
  ])('rejects %s as unprocessable', async (_label, error) => {
    runMock.mockRejectedValue(error);

    await expect(
      adapter.extractText(Buffer.from('msg')),
    ).rejects.toBeInstanceOf(UnprocessableDocumentError);
  });

  it('rethrows worker infrastructure failures unchanged', async () => {
    const failure = errorWith({ code: 'ERR_WORKER_INIT_FAILED' });
    runMock.mockRejectedValue(failure);

    await expect(adapter.extractText(Buffer.from('msg'))).rejects.toBe(failure);
  });
});
