import { randomUUID, type UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { CountMessagesTokensUseCase } from 'src/domain/messages/application/use-cases/count-messages-tokens/count-messages-tokens.use-case';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { PresignDownloadUseCase } from 'src/domain/storage/application/use-cases/presign-download/presign-download.use-case';
import type { DownloadRequest } from 'src/domain/storage/domain/download-request.object';
import type { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import type { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import {
  ThreadFileAddedBySkillError,
  ThreadFileNotFoundError,
  ThreadFileNotStoredError,
} from 'src/domain/threads/application/threads.errors';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ResolveThreadFileQuery } from './resolve-thread-file.query';
import { ResolveThreadFileUseCase } from './resolve-thread-file.use-case';

const ORG_ID = randomUUID();
const USER_A = randomUUID();
const USER_B = randomUUID();

function uploadKey(fileName: string): string {
  return `${ORG_ID}/uploads/${randomUUID()}/${fileName}`;
}

function pdf(name = 'Bauantrag Müller.pdf'): FileSource {
  return new FileSource({
    name,
    fileType: FileType.PDF,
    type: TextType.FILE,
    storageKey: uploadKey('Bauantrag_M_ller.pdf'),
  });
}

function chat(userId: UUID, ...assignments: SourceAssignment[]): Thread {
  return new Thread({ userId, messages: [], sourceAssignments: assignments });
}

function attached(source: Source): SourceAssignment {
  return new SourceAssignment({ source });
}

describe('ResolveThreadFileUseCase', () => {
  let threads: Thread[];
  let currentUserId: UUID;
  let useCase: ResolveThreadFileUseCase;

  beforeEach(() => {
    threads = [];
    currentUserId = USER_A;
    const threadsRepository = {
      findOne: jest.fn((id: UUID, userId: UUID) =>
        Promise.resolve(
          threads.find((t) => t.id === id && t.userId === userId) ?? null,
        ),
      ),
    } as unknown as ThreadsRepository;
    const contextService = {
      get: jest.fn(
        (key: string) =>
          ({
            userId: currentUserId,
            orgId: ORG_ID,
            role: UserRole.USER,
            systemRole: SystemRole.CUSTOMER,
          })[key],
      ),
    } as unknown as ContextService;
    const countTokens = {
      execute: jest.fn().mockReturnValue(0),
    } as unknown as CountMessagesTokensUseCase;
    const objectStorage = {
      presignDownload: (url: StorageUrl, request: DownloadRequest) => {
        const signed = new URL(`https://files.example.org/${url.objectName}`);
        signed.searchParams.set('signedAt', request.signedAt.toISOString());
        signed.searchParams.set('expires', String(request.expiresInSeconds));
        signed.searchParams.set('type', request.contentType ?? '');
        signed.searchParams.set('name', request.fileName ?? '');
        return Promise.resolve(signed.toString());
      },
    } as unknown as ObjectStoragePort;
    useCase = new ResolveThreadFileUseCase(
      new FindThreadUseCase(threadsRepository, contextService, countTokens),
      new PresignDownloadUseCase(objectStorage),
    );
  });

  afterEach(() => jest.restoreAllMocks());

  function resolve(thread: Thread, sourceId: string) {
    return useCase.execute(new ResolveThreadFileQuery(thread.id, sourceId));
  }

  async function rejection(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
      () => {
        throw new Error('expected a rejection');
      },
      (error: unknown) => error,
    );
  }

  it('hands over a user-attached PDF with a URL for its stored original and its uploaded name and type', async () => {
    const source = pdf();
    const thread = chat(USER_A, attached(source));
    threads.push(thread);

    const file = await resolve(thread, source.id);

    expect(file).toEqual({
      download_url: expect.any(String) as string,
      file_id: source.id,
      mime_type: 'application/pdf',
      file_name: 'Bauantrag Müller.pdf',
    });
    const url = new URL(file.download_url);
    expect(url.pathname).toBe(`/${source.storageKey}`);
    expect(url.searchParams.get('type')).toBe('application/pdf');
    expect(url.searchParams.get('name')).toBe('Bauantrag Müller.pdf');
    expect(url.searchParams.get('expires')).toBe('300');
  });

  it.each([
    {
      upload: 'a workbook, for one of its sheets',
      sourceName: 'Haushalt_2026_Einnahmen.csv',
      objectName: 'Haushalt_2026.xlsx',
      fileName: 'Haushalt_2026.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    {
      upload: 'a CSV file',
      sourceName: 'Haushalt März.csv',
      objectName: 'Haushalt_M_rz.csv',
      fileName: 'Haushalt März.csv',
      mimeType: 'text/csv',
    },
  ])(
    'hands over the uploaded file with its own name and type for $upload',
    async ({ sourceName, objectName, fileName, mimeType }) => {
      const storageKey = uploadKey(objectName);
      const source = new CSVDataSource({
        name: sourceName,
        data: { headers: [], rows: [] },
        storageKey,
      });
      const thread = chat(USER_A, attached(source));
      threads.push(thread);

      const file = await resolve(thread, source.id);

      expect(file).toMatchObject({
        file_id: source.id,
        file_name: fileName,
        mime_type: mimeType,
      });
      expect(new URL(file.download_url).pathname).toBe(`/${storageKey}`);
    },
  );

  it("rejects user A's file for user B with A's thread and with B's own thread, then resolves it for A", async () => {
    const source = pdf();
    const threadA = chat(USER_A, attached(source));
    const threadB = chat(USER_B, attached(pdf()));
    threads.push(threadA, threadB);

    currentUserId = USER_B;
    await expect(resolve(threadA, source.id)).rejects.toThrow(
      ThreadFileNotFoundError,
    );
    await expect(resolve(threadB, source.id)).rejects.toThrow(
      ThreadFileNotFoundError,
    );

    currentUserId = USER_A;
    await expect(resolve(threadA, source.id)).resolves.toMatchObject({
      file_id: source.id,
    });
  });

  it("rejects another thread's file, another user's file and an unknown ID with indistinguishable errors", async () => {
    const otherThreadSource = pdf();
    const foreignSource = pdf();
    const thread = chat(USER_A, attached(pdf()));
    threads.push(
      thread,
      chat(USER_A, attached(otherThreadSource)),
      chat(USER_B, attached(foreignSource)),
    );
    const sourceId = randomUUID();

    const errors = await Promise.all(
      [otherThreadSource, foreignSource]
        .map((source) => resolve(thread, source.id))
        .concat(resolve(thread, 'not-a-uuid'))
        .map((promise) => rejection(promise)),
    );
    const unknownThread = await rejection(
      useCase.execute(new ResolveThreadFileQuery(randomUUID(), sourceId)),
    );
    const unknownSource = await rejection(resolve(thread, sourceId));

    for (const error of errors) {
      expect(error).toBeInstanceOf(ThreadFileNotFoundError);
    }
    expect(unknownThread).toBeInstanceOf(ThreadFileNotFoundError);
    expect(unknownThread).toEqual(unknownSource);
    expect((unknownThread as ThreadFileNotFoundError).metadata).toEqual({
      sourceId,
    });
  });

  it('rejects a file that a skill added to the chat', async () => {
    const source = pdf();
    const thread = chat(
      USER_A,
      new SourceAssignment({ source, originSkillId: randomUUID() }),
    );
    threads.push(thread);

    await expect(resolve(thread, source.id)).rejects.toThrow(
      ThreadFileAddedBySkillError,
    );
  });

  it('rejects a file without a stored original', async () => {
    const legacy = new FileSource({
      name: 'Alt.pdf',
      fileType: FileType.PDF,
      type: TextType.FILE,
    });
    const thread = chat(USER_A, attached(legacy));
    threads.push(thread);

    await expect(resolve(thread, legacy.id)).rejects.toThrow(
      ThreadFileNotStoredError,
    );
  });

  it('returns the identical file object for a retry within one signing window', async () => {
    const source = pdf();
    const thread = chat(USER_A, attached(source));
    threads.push(thread);
    const windowMs = 120_000;
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    const now = jest.spyOn(Date, 'now');

    now.mockReturnValue(windowStart);
    const first = await resolve(thread, source.id);
    now.mockReturnValue(windowStart + windowMs - 1);
    const retry = await resolve(thread, source.id);

    expect(retry).toEqual(first);
  });
});
