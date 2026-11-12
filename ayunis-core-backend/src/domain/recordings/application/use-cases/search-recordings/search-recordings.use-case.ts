import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type {
  RecordingSearchResult,
  SearchableRecording,
} from 'src/domain/recordings/application/models/recording-search';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { UnexpectedRecordingError } from 'src/domain/recordings/application/recordings.errors';
import { CollectiveRecordingAccessService } from 'src/domain/recordings/application/services/collective-recording-access.service';
import { SearchMultiContentQuery } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.query';
import { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import type { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { FindContentChunksByIdsQuery } from 'src/domain/sources/application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.query';
import { FindContentChunksByIdsUseCase } from 'src/domain/sources/application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.use-case';
import { transcriptChunkPosition } from 'src/domain/sources/application/util/transcript-chunks';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { SearchRecordingsQuery } from './search-recordings.query';

const MAX_MATCHES_PER_QUERY = 10;
const MAX_TOTAL_MATCHES = 20;

/**
 * Searches the transcripts and summaries of every recording the user can read
 * now: their own, their teams', their organization's and, in a workspace
 * chat, that workspace's.
 */
@Injectable()
export class SearchRecordingsUseCase {
  private readonly logger = new Logger(SearchRecordingsUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly collectiveAccess: CollectiveRecordingAccessService,
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
    private readonly searchContent: SearchContentUseCase,
    private readonly findContentChunks: FindContentChunksByIdsUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(
    query: SearchRecordingsQuery,
  ): Promise<RecordingSearchResult[]> {
    const { userId, orgId } = getRequiredUserContext(this.context);
    this.logger.log(
      {
        queryCount: query.queries.length,
        workspaceId: query.workspaceId,
        uploaded: query.uploaded,
      },
      'Searching recordings',
    );
    const recordings = await this.repository.findSearchable({
      userId,
      owners: await this.collectiveAccess.readableOwners(),
      workspaceId: await this.readableWorkspace(query.workspaceId),
      uploaded: query.uploaded,
    });
    if (recordings.length === 0) return [];
    const matches = await this.searchContent.executeMulti(
      new SearchMultiContentQuery({
        orgId,
        queries: query.queries,
        documentIds: recordings.map(({ audioSourceId }) => audioSourceId),
        type: IndexType.PARENT_CHILD,
        limit: MAX_MATCHES_PER_QUERY,
      }),
    );
    return this.toResults(matches.slice(0, MAX_TOTAL_MATCHES), recordings);
  }

  private async readableWorkspace(
    workspaceId: UUID | null,
  ): Promise<UUID | null> {
    if (!workspaceId) return null;
    try {
      await this.workspaceRead.execute({ workspaceId });
      return workspaceId;
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) return null;
      throw error;
    }
  }

  private async toResults(
    matches: IndexMatch[],
    recordings: SearchableRecording[],
  ): Promise<RecordingSearchResult[]> {
    if (matches.length === 0) return [];
    const chunks = await this.findContentChunks.execute(
      new FindContentChunksByIdsQuery(
        matches.map(({ entry }) => entry.relatedChunkId),
      ),
    );
    const chunksById = new Map(chunks.map((found) => [found.chunk.id, found]));
    const recordingsByAudio = new Map(
      recordings.map((recording) => [recording.audioSourceId, recording]),
    );
    return matches.flatMap(({ entry, matchedQueries }) => {
      const found = chunksById.get(entry.relatedChunkId);
      const recording = found && recordingsByAudio.get(found.sourceId);
      if (!found || !recording) return [];
      return [
        {
          chunkId: found.chunk.id,
          content: found.chunk.content,
          recording: {
            id: recording.id,
            name: recording.name,
            uploadedAt: recording.uploadedAt,
          },
          position: transcriptChunkPosition(found.chunk),
          matchedQueries,
        },
      ];
    });
  }
}
