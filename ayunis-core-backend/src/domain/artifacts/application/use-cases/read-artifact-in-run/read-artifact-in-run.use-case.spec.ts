import type { UUID } from 'crypto';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { ArtifactNotFoundError } from 'src/domain/artifacts/application/artifacts.errors';
import { ArtifactPlaceholdersService } from 'src/domain/artifacts/application/services/artifact-placeholders.service';
import { ArtifactMaskAllocationLock } from 'src/domain/artifacts/application/services/artifact-mask-allocation-lock.service';
import {
  DocumentArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import type { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import { AllocateThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/allocate-thread-pii-masks/allocate-thread-pii-masks.use-case';
import { ThreadMaskAllocationLock } from 'src/domain/thread-pii-masks/application/services/thread-mask-allocation-lock.service';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { ReadArtifactInRunUseCase } from './read-artifact-in-run.use-case';
import { ReadArtifactInRunQuery } from './read-artifact-in-run.query';

describe('ReadArtifactInRunUseCase', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const orgId = '223e4567-e89b-12d3-a456-426614174999' as UUID;
  const artifactId = '323e4567-e89b-12d3-a456-426614174000' as UUID;
  const threadId = '423e4567-e89b-12d3-a456-426614174000' as UUID;
  const run = { threadId, isAnonymous: true };

  let chatDictionary: ThreadPiiMask[];
  let findByIdWithVersions: jest.Mock;
  let useCase: ReadArtifactInRunUseCase;

  beforeEach(() => {
    chatDictionary = [];
    findByIdWithVersions = jest.fn();
    const threadMasks = {
      findByThreadId: jest.fn(() => Promise.resolve([...chatDictionary])),
      saveMany: jest.fn((masks: ThreadPiiMask[]) => {
        chatDictionary.push(...masks);
        return Promise.resolve();
      }),
    };
    const artifactsRepository = {
      findByIdWithVersions,
    } as unknown as ArtifactsRepository;
    useCase = new ReadArtifactInRunUseCase(
      artifactsRepository,
      {
        get: jest.fn(getFromUserContext({ userId, orgId })),
      } as unknown as ContextService,
      new ArtifactPlaceholdersService(
        artifactsRepository,
        new ArtifactMaskAllocationLock(),
        {} as GetThreadPiiMasksUseCase,
        new AllocateThreadPiiMasksUseCase(
          threadMasks,
          new ThreadMaskAllocationLock(),
        ),
      ),
    );
  });

  const person = (maskIndex: number, value: string) => ({
    category: PiiCategory.PERSON_NAME,
    maskIndex,
    value,
  });

  function chatMask(maskIndex: number, value: string): ThreadPiiMask {
    return new ThreadPiiMask({ threadId, ...person(maskIndex, value) });
  }

  function version(versionNumber: number, content: string): ArtifactVersion {
    return new ArtifactVersion({
      artifactId,
      versionNumber,
      content,
      authorType: AuthorType.ASSISTANT,
    });
  }

  function givenDocument(
    content: string,
    params: { isAnonymous?: boolean; piiMasks?: ArtifactPiiMask[] } = {},
  ): void {
    findByIdWithVersions.mockResolvedValue(
      new DocumentArtifact({
        id: artifactId,
        threadId,
        userId,
        title: 'Brief an {{pii:PERSON_NAME_1}}',
        isAnonymous: params.isAnonymous ?? true,
        piiMasks: params.piiMasks ?? [
          new ArtifactPiiMask({ artifactId, ...person(1, 'Anna Schmidt') }),
        ],
        currentVersionNumber: 2,
        versions: [version(1, '<p>Entwurf</p>'), version(2, content)],
      }),
    );
  }

  const read = () =>
    useCase.execute(new ReadArtifactInRunQuery({ artifactId, run }));

  it('reads the artifact’s placeholders in title and content as the ones the chat already has for the same value, and returns the dictionary to stream', async () => {
    chatDictionary = [chatMask(1, 'Bernd Bauer'), chatMask(3, 'Anna Schmidt')];
    givenDocument('<p>Sehr geehrte {{pii:PERSON_NAME_1}}</p>');

    const result = await read();

    expect(result.title).toBe('Brief an {{pii:PERSON_NAME_3}}');
    expect(result.content).toBe('<p>Sehr geehrte {{pii:PERSON_NAME_3}}</p>');
    expect(chatDictionary).toHaveLength(2);
    // An editor save may have created the chat's mask outside any run.
    expect(result.threadPiiMasks?.map((mask) => mask.token)).toEqual([
      '{{pii:PERSON_NAME_1}}',
      '{{pii:PERSON_NAME_3}}',
    ]);
  });

  it('gives a value the chat does not know a new chat mask and returns the dictionary to stream', async () => {
    chatDictionary = [chatMask(1, 'Bernd Bauer'), chatMask(2, 'Carla Weber')];
    givenDocument('<p>Sehr geehrte {{pii:PERSON_NAME_1}}</p>');

    const result = await read();

    expect(result.content).toBe('<p>Sehr geehrte {{pii:PERSON_NAME_3}}</p>');
    expect(chatDictionary.map((mask) => [mask.token, mask.value])).toEqual([
      ['{{pii:PERSON_NAME_1}}', 'Bernd Bauer'],
      ['{{pii:PERSON_NAME_2}}', 'Carla Weber'],
      ['{{pii:PERSON_NAME_3}}', 'Anna Schmidt'],
    ]);
    expect(result.threadPiiMasks?.map((mask) => mask.token)).toEqual([
      '{{pii:PERSON_NAME_1}}',
      '{{pii:PERSON_NAME_2}}',
      '{{pii:PERSON_NAME_3}}',
    ]);
  });

  it('translates spreadsheet headers and cells, formulas included, and keeps the JSON valid', async () => {
    chatDictionary = [chatMask(5, 'Anna Schmidt')];
    findByIdWithVersions.mockResolvedValue(
      new SpreadsheetArtifact({
        id: artifactId,
        threadId,
        userId,
        title: 'Kontakte',
        isAnonymous: true,
        piiMasks: [
          new ArtifactPiiMask({ artifactId, ...person(1, 'Anna Schmidt') }),
        ],
        currentVersionNumber: 1,
        versions: [
          version(
            1,
            JSON.stringify({
              format: 'spreadsheet-v1',
              columns: ['Kontakt {{pii:PERSON_NAME_1}}'],
              rows: [['=IF(A1="{{pii:PERSON_NAME_1}}",1,0)'], [42]],
            }),
          ),
        ],
      }),
    );

    const result = await read();

    expect(JSON.parse(result.content)).toEqual({
      format: 'spreadsheet-v1',
      columns: ['Kontakt {{pii:PERSON_NAME_5}}'],
      rows: [['=IF(A1="{{pii:PERSON_NAME_5}}",1,0)'], [42]],
    });
  });

  it('returns a normal artifact’s current version as stored, without touching the chat’s dictionary', async () => {
    givenDocument('<p>{{pii:PERSON_NAME_1}}</p>', {
      isAnonymous: false,
      piiMasks: [],
    });

    const result = await read();

    expect(result.title).toBe('Brief an {{pii:PERSON_NAME_1}}');
    expect(result.content).toBe('<p>{{pii:PERSON_NAME_1}}</p>');
    expect(result.threadPiiMasks).toBeNull();
    expect(chatDictionary).toEqual([]);
  });

  it('looks the artifact up only among those linked to the run’s chat in the run’s mode', async () => {
    findByIdWithVersions.mockResolvedValue(null);

    await expect(read()).rejects.toThrow(ArtifactNotFoundError);
    expect(findByIdWithVersions).toHaveBeenCalledWith(artifactId, userId, {
      linkedThreadId: threadId,
      isAnonymous: true,
    });
  });
});
