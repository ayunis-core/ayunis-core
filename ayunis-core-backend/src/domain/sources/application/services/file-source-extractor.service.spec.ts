import type { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import type { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import type { DownloadObjectCommand } from 'src/domain/storage/application/use-cases/download-object/download-object.command';
import type { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import {
  FileSourceExtractor,
  type FileSourceInput,
} from './file-source-extractor.service';

const INPUT: FileSourceInput = {
  minioPath: 'org-1/processing/source-1/Bebauungsplan.pdf',
  fileName: 'Bebauungsplan.pdf',
  fileType: 'application/pdf',
};

describe('FileSourceExtractor', () => {
  let downloadObjectUseCase: {
    execute: jest.Mock<Promise<AsyncIterable<Buffer>>, [DownloadObjectCommand]>;
  };
  let deleteObjectUseCase: {
    execute: jest.Mock<Promise<void>, [DeleteObjectCommand]>;
  };
  let retrieveFileContentUseCase: {
    execute: jest.Mock<
      Promise<{ pages: { text: string }[] }>,
      [RetrieveFileContentCommand]
    >;
  };
  let splitTextUseCase: {
    execute: jest.Mock<
      { chunks: { text: string; metadata: Record<string, unknown> }[] },
      [SplitTextCommand]
    >;
  };
  let extractor: FileSourceExtractor;

  beforeEach(() => {
    downloadObjectUseCase = {
      execute: jest.fn<Promise<AsyncIterable<Buffer>>, [DownloadObjectCommand]>(
        async () =>
          (async function* () {
            yield Buffer.from('%PDF-');
            yield Buffer.from('1.7');
          })(),
      ),
    };
    deleteObjectUseCase = {
      execute: jest.fn<Promise<void>, [DeleteObjectCommand]>(async () => {}),
    };
    retrieveFileContentUseCase = {
      execute: jest.fn<
        Promise<{ pages: { text: string }[] }>,
        [RetrieveFileContentCommand]
      >(async () => ({
        pages: [{ text: 'Seite 1: Geltungsbereich' }, { text: 'Seite 2: Art' }],
      })),
    };
    splitTextUseCase = {
      execute: jest.fn((command: SplitTextCommand) => ({
        chunks: [{ text: command.text, metadata: { startLine: 1 } }],
      })),
    };
    extractor = new FileSourceExtractor(
      downloadObjectUseCase as never,
      deleteObjectUseCase as never,
      retrieveFileContentUseCase as never,
      splitTextUseCase as never,
    );
  });

  it('retrieves the staged file with its name and type', async () => {
    await extractor.extract(INPUT);

    expect(downloadObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: INPUT.minioPath }),
    );
    const [command] = retrieveFileContentUseCase.execute.mock.calls[0];
    expect(command).toMatchObject({
      fileName: 'Bebauungsplan.pdf',
      fileType: 'application/pdf',
    });
    expect(command.fileData.toString()).toBe('%PDF-1.7');
  });

  it('joins the retrieved pages into the source text', async () => {
    const extracted = await extractor.extract(INPUT);

    expect(extracted.text).toBe('Seite 1: Geltungsbereich\nSeite 2: Art');
  });

  it('tags every chunk with the file name and the splitter metadata', async () => {
    const extracted = await extractor.extract(INPUT);

    expect(extracted.chunks.map((chunk) => chunk.meta)).toEqual([
      { fileName: 'Bebauungsplan.pdf', startLine: 1 },
    ]);
  });

  it('keeps the source name', async () => {
    const extracted = await extractor.extract(INPUT);

    expect(extracted.name).toBeUndefined();
  });

  it('deletes the staged file on release', async () => {
    await extractor.release(INPUT);

    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: INPUT.minioPath }),
    );
  });

  it('does not throw when deleting the staged file fails', async () => {
    deleteObjectUseCase.execute.mockRejectedValueOnce(new Error('MinIO down'));

    await expect(extractor.release(INPUT)).resolves.toBeUndefined();
  });
});
