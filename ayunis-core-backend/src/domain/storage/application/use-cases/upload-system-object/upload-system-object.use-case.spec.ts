import type { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { InvalidObjectNameError } from 'src/domain/storage/application/storage.errors';
import { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { UploadSystemObjectCommand } from './upload-system-object.command';
import { UploadSystemObjectUseCase } from './upload-system-object.use-case';

const ORG_ID = '11111111-1111-1111-1111-111111111111';

describe(UploadSystemObjectUseCase.name, () => {
  const uploadObject = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<UploadObjectUseCase>;
  const useCase = new UploadSystemObjectUseCase(uploadObject);

  beforeEach(() => {
    jest.clearAllMocks();
    uploadObject.execute.mockImplementation((command) =>
      Promise.resolve(
        new StorageObject(command.objectName, 'documents', 5, 'etag', {}),
      ),
    );
  });

  it('stores an object outside every organisation layout', async () => {
    const command = new UploadSystemObjectCommand(
      'release-notes/c76cd1b4-3b80-4666-bc4f-913161122056/3f1a.webp',
      Buffer.from('image'),
      { contentType: 'image/webp' },
    );

    const stored = await useCase.execute(command);

    expect(stored.objectName).toBe(command.objectName);
    expect(uploadObject.execute).toHaveBeenCalledWith(command);
  });

  it.each([
    ['the top-level org layout', `${ORG_ID}/release-notes/a.webp`],
    ['the generated-images layout', `generated-images/${ORG_ID}/a.webp`],
    ['the letterheads layout', `letterheads/${ORG_ID}/a.pdf`],
  ])(
    'rejects a key in %s, which the org purge and orphan sweep would delete',
    async (_layout, objectName) => {
      await expect(
        useCase.execute(
          new UploadSystemObjectCommand(objectName, Buffer.from('image')),
        ),
      ).rejects.toThrow(InvalidObjectNameError);
      expect(uploadObject.execute).not.toHaveBeenCalled();
    },
  );
});
