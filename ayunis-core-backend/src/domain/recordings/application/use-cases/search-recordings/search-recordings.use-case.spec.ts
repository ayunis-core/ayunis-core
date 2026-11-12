import { randomUUID, type UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { SearchableRecording } from 'src/domain/recordings/application/models/recording-search';
import type { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import type { CollectiveRecordingAccessService } from 'src/domain/recordings/application/services/collective-recording-access.service';
import type { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import type { FindContentChunksByIdsUseCase } from 'src/domain/sources/application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.use-case';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { SearchRecordingsQuery } from './search-recordings.query';
import { SearchRecordingsUseCase } from './search-recordings.use-case';

describe(SearchRecordingsUseCase.name, () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  const teamId = randomUUID();
  const workspaceId = randomUUID();
  const council: SearchableRecording = {
    id: randomUUID(),
    name: 'Gemeinderat März',
    uploadedAt: new Date('2026-03-02T09:30:00Z'),
    audioSourceId: randomUUID(),
  };

  function transcriptChunk(): TextSourceContentChunk {
    return new TextSourceContentChunk({
      content:
        '[00:00:03.000 - 00:00:03.900] Speaker 1: Der Haushalt ist beschlossen.',
      meta: {
        fileName: 'sitzung.mp3',
        start: 3,
        end: 3.9,
        speakers: ['speaker_0'],
      },
    });
  }

  function setup({
    recordings = [council],
    chunks = [transcriptChunk()],
    workspaceReadable = true,
  }: {
    recordings?: SearchableRecording[];
    chunks?: TextSourceContentChunk[];
    workspaceReadable?: boolean;
  } = {}) {
    const findSearchable = jest.fn().mockResolvedValue(recordings);
    const executeMulti = jest.fn().mockResolvedValue(
      chunks.map(
        (chunk) =>
          new IndexMatch({
            entry: new IndexEntry({
              relatedDocumentId: council.audioSourceId,
              relatedChunkId: chunk.id,
            }),
            matchedQueries: ['Haushalt'],
          }),
      ),
    );
    const context = {
      get: (key: string) =>
        ({ userId, orgId, role: 'user', systemRole: 'customer' })[key],
    } as unknown as ContextService;
    const useCase = new SearchRecordingsUseCase(
      { findSearchable } as unknown as RecordingRepository,
      {
        readableOwners: () => Promise.resolve({ orgId, teamIds: [teamId] }),
      } as unknown as CollectiveRecordingAccessService,
      {
        execute: () =>
          workspaceReadable
            ? Promise.resolve()
            : Promise.reject(new WorkspaceNotFoundError(workspaceId)),
      } as unknown as AssertWorkspaceReadAccessUseCase,
      { executeMulti } as unknown as SearchContentUseCase,
      {
        execute: (query: { chunkIds: UUID[] }) =>
          Promise.resolve(
            chunks
              .filter((chunk) => query.chunkIds.includes(chunk.id))
              .map((chunk) => ({
                chunk,
                sourceId: council.audioSourceId,
                sourceName: 'sitzung.mp3',
                sourceCreatedBy: SourceCreator.USER,
              })),
          ),
      } as unknown as FindContentChunksByIdsUseCase,
      context,
    );
    return { useCase, findSearchable, executeMulti };
  }

  it('cites each match with its recording and its place in the transcript', async () => {
    const { useCase } = setup();

    const [result] = await useCase.execute(
      new SearchRecordingsQuery(['Haushalt'], null),
    );

    expect(result).toMatchObject({
      content: expect.stringContaining('Der Haushalt ist beschlossen.'),
      recording: {
        id: council.id,
        name: 'Gemeinderat März',
        uploadedAt: council.uploadedAt,
      },
      position: { kind: 'transcript', start: 3, end: 3.9, speakerNumbers: [1] },
      matchedQueries: ['Haushalt'],
    });
  });

  it('searches the workspace recordings of a workspace chat only while the user can read the workspace', async () => {
    const readable = setup();
    await readable.useCase.execute(
      new SearchRecordingsQuery(['Haushalt'], workspaceId),
    );
    expect(readable.findSearchable.mock.calls[0][0]).toMatchObject({
      userId,
      owners: { orgId, teamIds: [teamId] },
      workspaceId,
    });

    const lost = setup({ workspaceReadable: false });
    await lost.useCase.execute(
      new SearchRecordingsQuery(['Haushalt'], workspaceId),
    );
    expect(lost.findSearchable.mock.calls[0][0]).toMatchObject({
      workspaceId: null,
    });
  });

  it('returns at most 20 matches in total', async () => {
    const chunks = Array.from({ length: 25 }, transcriptChunk);

    const results = await setup({ chunks }).useCase.execute(
      new SearchRecordingsQuery(['Haushalt', 'Beschluss', 'Etat'], null),
    );

    expect(results).toHaveLength(20);
  });

  it('finds nothing and embeds no query when the user can read no recording', async () => {
    const { useCase, executeMulti } = setup({ recordings: [] });

    await expect(
      useCase.execute(new SearchRecordingsQuery(['Haushalt'], null)),
    ).resolves.toEqual([]);
    expect(executeMulti).not.toHaveBeenCalled();
  });
});
