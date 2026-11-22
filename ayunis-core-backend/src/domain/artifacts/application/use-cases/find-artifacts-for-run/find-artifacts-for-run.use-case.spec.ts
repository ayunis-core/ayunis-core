import type { UUID } from 'crypto';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { ArtifactPlaceholdersService } from 'src/domain/artifacts/application/services/artifact-placeholders.service';
import { ArtifactMaskAllocationLock } from 'src/domain/artifacts/application/services/artifact-mask-allocation-lock.service';
import {
  DiagramArtifact,
  DocumentArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import type { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import { AllocateThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/allocate-thread-pii-masks/allocate-thread-pii-masks.use-case';
import { ThreadMaskAllocationLock } from 'src/domain/thread-pii-masks/application/services/thread-mask-allocation-lock.service';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { FindArtifactsForRunUseCase } from './find-artifacts-for-run.use-case';
import { FindArtifactsForRunQuery } from './find-artifacts-for-run.query';

describe('FindArtifactsForRunUseCase', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const orgId = '223e4567-e89b-12d3-a456-426614174999' as UUID;
  const threadId = '423e4567-e89b-12d3-a456-426614174000' as UUID;
  const letterId = '523e4567-e89b-12d3-a456-426614174000' as UUID;
  const processId = '623e4567-e89b-12d3-a456-426614174000' as UUID;

  let chatDictionary: ThreadPiiMask[];
  let findByThreadId: jest.Mock;
  let useCase: FindArtifactsForRunUseCase;

  beforeEach(() => {
    chatDictionary = [];
    findByThreadId = jest.fn();
    const threadMasks = {
      findByThreadId: jest.fn(() => Promise.resolve([...chatDictionary])),
      saveMany: jest.fn((masks: ThreadPiiMask[]) => {
        chatDictionary.push(...masks);
        return Promise.resolve();
      }),
    };
    const artifactsRepository = {
      findByThreadId,
    } as unknown as ArtifactsRepository;
    useCase = new FindArtifactsForRunUseCase(
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

  it('lists anonymous artifacts with their titles in the chat’s placeholders, allocating values the chat does not know', async () => {
    chatDictionary = [
      new ThreadPiiMask({ threadId, ...person(4, 'Anna Schmidt') }),
    ];
    findByThreadId.mockResolvedValue([
      new DocumentArtifact({
        id: letterId,
        threadId,
        userId,
        title: 'Brief an {{pii:PERSON_NAME_1}}',
        isAnonymous: true,
        piiMasks: [
          new ArtifactPiiMask({
            artifactId: letterId,
            ...person(1, 'Anna Schmidt'),
          }),
        ],
      }),
      new DiagramArtifact({
        id: processId,
        threadId,
        userId,
        title: 'Ablauf {{pii:PERSON_NAME_1}}',
        isAnonymous: true,
        piiMasks: [
          new ArtifactPiiMask({
            artifactId: processId,
            ...person(1, 'Bernd Bauer'),
          }),
        ],
      }),
    ]);

    const result = await useCase.execute(
      new FindArtifactsForRunQuery({ run: { threadId, isAnonymous: true } }),
    );

    expect(
      result.artifacts.map(({ artifact, title }) => [artifact.id, title]),
    ).toEqual([
      [letterId, 'Brief an {{pii:PERSON_NAME_4}}'],
      [processId, 'Ablauf {{pii:PERSON_NAME_5}}'],
    ]);
    expect(result.threadPiiMasks?.map((mask) => mask.value)).toEqual([
      'Anna Schmidt',
      'Bernd Bauer',
    ]);
    expect(findByThreadId).toHaveBeenCalledWith(threadId, userId, {
      isAnonymous: true,
    });
  });

  it('lists a normal run’s artifacts with their titles as stored, without touching the chat’s dictionary', async () => {
    findByThreadId.mockResolvedValue([
      new DocumentArtifact({
        id: letterId,
        threadId,
        userId,
        title: 'Brief an Anna Schmidt',
      }),
    ]);

    const result = await useCase.execute(
      new FindArtifactsForRunQuery({ run: { threadId, isAnonymous: false } }),
    );

    expect(result.artifacts.map(({ title }) => title)).toEqual([
      'Brief an Anna Schmidt',
    ]);
    expect(result.threadPiiMasks).toBeNull();
    expect(chatDictionary).toEqual([]);
    expect(findByThreadId).toHaveBeenCalledWith(threadId, userId, {
      isAnonymous: false,
    });
  });
});
