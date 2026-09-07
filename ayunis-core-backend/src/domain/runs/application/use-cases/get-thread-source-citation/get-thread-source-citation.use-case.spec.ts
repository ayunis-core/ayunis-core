import { randomUUID, type UUID } from 'crypto';
import type { ThreadCitationContext } from 'src/domain/threads/application/models/thread-citation-context';
import type { FindThreadCitationContextUseCase } from 'src/domain/threads/application/use-cases/find-thread-citation-context/find-thread-citation-context.use-case';
import type { FindSourceCitationTargetUseCase } from 'src/domain/sources/application/use-cases/find-source-citation-target/find-source-citation-target.use-case';
import type { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import type { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import type { GetKnowledgeBaseDocumentTextUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.use-case';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { SourceCitationTarget } from 'src/domain/sources/application/models/source-citation-target';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { SourceCitationNotFoundError } from 'src/domain/runs/application/runs.errors';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import {
  DocumentNotInKnowledgeBaseError,
  KnowledgeBaseNotFoundError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { GetThreadSourceCitationQuery } from './get-thread-source-citation.query';
import { GetThreadSourceCitationUseCase } from './get-thread-source-citation.use-case';

describe('GetThreadSourceCitationUseCase', () => {
  const threadId = randomUUID();
  const userId = randomUUID();
  const orgId = randomUUID();
  const chunkId = randomUUID();
  let findThreadCitationContextUseCase: jest.Mocked<FindThreadCitationContextUseCase>;
  let findCitationTargetUseCase: jest.Mocked<FindSourceCitationTargetUseCase>;
  let findOneSkillUseCase: jest.Mocked<FindOneSkillUseCase>;
  let getKnowledgeBaseDocumentTextUseCase: jest.Mocked<GetKnowledgeBaseDocumentTextUseCase>;
  let buildWorkspaceRunContextUseCase: jest.Mocked<BuildWorkspaceRunContextUseCase>;
  let useCase: GetThreadSourceCitationUseCase;

  beforeEach(() => {
    findThreadCitationContextUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindThreadCitationContextUseCase>;
    findCitationTargetUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindSourceCitationTargetUseCase>;
    findOneSkillUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindOneSkillUseCase>;
    getKnowledgeBaseDocumentTextUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetKnowledgeBaseDocumentTextUseCase>;
    buildWorkspaceRunContextUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildWorkspaceRunContextUseCase>;
    useCase = new GetThreadSourceCitationUseCase(
      findThreadCitationContextUseCase,
      findCitationTargetUseCase,
      findOneSkillUseCase,
      getKnowledgeBaseDocumentTextUseCase,
      buildWorkspaceRunContextUseCase,
    );
  });

  function source(
    id = randomUUID(),
    createdBy = SourceCreator.USER,
  ): FileSource {
    return new FileSource({
      id,
      name: 'Municipal Budget 2026.pdf',
      fileType: FileType.PDF,
      type: TextType.FILE,
      createdBy,
      status: SourceStatus.READY,
    });
  }

  function target(
    params: {
      sourceId?: UUID;
      knowledgeBaseId?: UUID | null;
      createdBy?: SourceCreator;
      status?: SourceStatus;
      sourceUrl?: string | null;
      chunkUrl?: string;
    } = {},
  ): SourceCitationTarget {
    return {
      chunk: new TextSourceContentChunk({
        id: chunkId,
        content: 'Funding increases by ten percent.',
        meta: {
          startLine: 8,
          endLine: 9,
          startCharOffset: 120,
          endCharOffset: 161,
          ...(params.chunkUrl ? { url: params.chunkUrl } : {}),
        },
      }),
      source: {
        id: params.sourceId ?? randomUUID(),
        name: 'Municipal Budget 2026.pdf',
        createdBy: params.createdBy ?? SourceCreator.USER,
        status: params.status ?? SourceStatus.READY,
        knowledgeBaseId: params.knowledgeBaseId ?? null,
        url: params.sourceUrl ?? null,
      },
    };
  }

  function thread(
    params: {
      directSourceIds?: UUID[];
      skillSource?: { sourceId: UUID; skillId: UUID };
      knowledgeBaseIds?: UUID[];
      workspaceId?: UUID | null;
    } = {},
  ): ThreadCitationContext {
    return {
      userId,
      workspaceId: params.workspaceId ?? null,
      sourceAssignments: [
        ...(params.directSourceIds ?? []).map((sourceId) => ({
          sourceId,
          originSkillId: null,
        })),
        ...(params.skillSource
          ? [
              {
                sourceId: params.skillSource.sourceId,
                originSkillId: params.skillSource.skillId,
              },
            ]
          : []),
      ],
      knowledgeBaseAssignments: (params.knowledgeBaseIds ?? []).map(
        (knowledgeBaseId) => ({ knowledgeBaseId, originSkillId: null }),
      ),
    };
  }

  function workspaceContext(params: {
    sources?: FileSource[];
    knowledgeBaseIds?: UUID[];
  }): WorkspaceRunContext {
    return {
      instruction: null,
      skills: [],
      knowledgeBases: [],
      sources: [],
      runtimeSources: params.sources ?? [],
      runtimeKnowledgeBases: (params.knowledgeBaseIds ?? []).map((id) => ({
        id,
        name: 'Workspace policies',
        description: null,
        documentCount: 1,
      })),
      mcpIntegrationIds: [],
    };
  }

  function expectedResult(citationTarget: SourceCitationTarget) {
    return {
      chunk: {
        id: citationTarget.chunk.id,
        content: citationTarget.chunk.content,
        startLine: 8,
        endLine: 9,
      },
      source: {
        id: citationTarget.source.id,
        name: citationTarget.source.name,
        url: citationTarget.source.url,
      },
    };
  }

  async function executeFor(
    currentThread: ThreadCitationContext,
    citationTarget: SourceCitationTarget | null,
  ) {
    findThreadCitationContextUseCase.execute.mockResolvedValue(currentThread);
    findCitationTargetUseCase.execute.mockResolvedValue(citationTarget);
    return useCase.execute(
      new GetThreadSourceCitationQuery(threadId, chunkId, orgId),
    );
  }

  it('returns the same citation 404 when the thread is inaccessible', async () => {
    findThreadCitationContextUseCase.execute.mockRejectedValue(
      new ThreadNotFoundError(threadId, userId),
    );

    await expect(
      useCase.execute(
        new GetThreadSourceCitationQuery(threadId, chunkId, orgId),
      ),
    ).rejects.toThrow(SourceCitationNotFoundError);
    expect(findCitationTargetUseCase.execute).not.toHaveBeenCalled();
    expect(buildWorkspaceRunContextUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns a direct citation without building workspace context', async () => {
    const citationTarget = target();

    await expect(
      executeFor(
        thread({
          directSourceIds: [citationTarget.source.id],
          workspaceId: randomUUID(),
        }),
        citationTarget,
      ),
    ).resolves.toEqual(expectedResult(citationTarget));
    expect(findOneSkillUseCase.execute).not.toHaveBeenCalled();
    expect(getKnowledgeBaseDocumentTextUseCase.execute).not.toHaveBeenCalled();
    expect(buildWorkspaceRunContextUseCase.execute).not.toHaveBeenCalled();
  });

  it('does not treat a persisted skill source assignment as current access', async () => {
    const citationTarget = target();
    const skillId = randomUUID();
    findOneSkillUseCase.execute.mockRejectedValue(
      new SkillNotFoundError(skillId),
    );

    await expect(
      executeFor(
        thread({
          skillSource: {
            sourceId: citationTarget.source.id,
            skillId,
          },
        }),
        citationTarget,
      ),
    ).rejects.toThrow(SourceCitationNotFoundError);
  });

  it('returns a skill source only while the skill remains accessible', async () => {
    const citationTarget = target();
    const skillId = randomUUID();
    findOneSkillUseCase.execute.mockResolvedValue({
      skill: { sourceIds: [citationTarget.source.id] },
    } as unknown as Awaited<ReturnType<FindOneSkillUseCase['execute']>>);

    await expect(
      executeFor(
        thread({
          skillSource: { sourceId: citationTarget.source.id, skillId },
        }),
        citationTarget,
      ),
    ).resolves.toEqual(expectedResult(citationTarget));
  });

  it('rejects an accessible skill that no longer contains the source', async () => {
    const citationTarget = target();
    const skillId = randomUUID();
    findOneSkillUseCase.execute.mockResolvedValue({
      skill: { sourceIds: [] },
    } as unknown as Awaited<ReturnType<FindOneSkillUseCase['execute']>>);

    await expect(
      executeFor(
        thread({
          skillSource: { sourceId: citationTarget.source.id, skillId },
        }),
        citationTarget,
      ),
    ).rejects.toThrow(SourceCitationNotFoundError);
  });

  it('uses a chunk-specific URL when available', async () => {
    const citationTarget = target({
      sourceUrl: 'https://example.com',
      chunkUrl: 'https://example.com/relevant-page',
    });

    const result = await executeFor(
      thread({ directSourceIds: [citationTarget.source.id] }),
      citationTarget,
    );

    expect(result.source.url).toBe('https://example.com/relevant-page');
  });

  it('falls back to the source root URL when the chunk has no URL', async () => {
    const citationTarget = target({ sourceUrl: 'https://example.com' });

    const result = await executeFor(
      thread({ directSourceIds: [citationTarget.source.id] }),
      citationTarget,
    );

    expect(result.source.url).toBe('https://example.com');
  });

  it('does not treat a persisted knowledge base assignment as current access', async () => {
    const knowledgeBaseId = randomUUID();
    const citationTarget = target({ knowledgeBaseId });
    getKnowledgeBaseDocumentTextUseCase.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBaseId),
    );

    await expect(
      executeFor(
        thread({ knowledgeBaseIds: [knowledgeBaseId] }),
        citationTarget,
      ),
    ).rejects.toThrow(SourceCitationNotFoundError);
  });

  it('rejects a source removed from an otherwise accessible knowledge base', async () => {
    const knowledgeBaseId = randomUUID();
    const citationTarget = target({ knowledgeBaseId });
    getKnowledgeBaseDocumentTextUseCase.execute.mockRejectedValue(
      new DocumentNotInKnowledgeBaseError(
        citationTarget.source.id,
        knowledgeBaseId,
      ),
    );

    await expect(
      executeFor(
        thread({ knowledgeBaseIds: [knowledgeBaseId] }),
        citationTarget,
      ),
    ).rejects.toThrow(SourceCitationNotFoundError);
  });

  it('returns a citation for a currently accessible assigned knowledge base', async () => {
    const knowledgeBaseId = randomUUID();
    const citationTarget = target({ knowledgeBaseId });
    getKnowledgeBaseDocumentTextUseCase.execute.mockResolvedValue(
      source(citationTarget.source.id),
    );

    await expect(
      executeFor(
        thread({ knowledgeBaseIds: [knowledgeBaseId] }),
        citationTarget,
      ),
    ).resolves.toEqual(expectedResult(citationTarget));
  });

  it('returns the citation 404 when the assigned workspace is inaccessible', async () => {
    const workspaceId = randomUUID();
    buildWorkspaceRunContextUseCase.execute.mockRejectedValue(
      new WorkspaceNotFoundError(workspaceId),
    );

    await expect(executeFor(thread({ workspaceId }), target())).rejects.toThrow(
      SourceCitationNotFoundError,
    );
  });

  it('returns a citation for a workspace runtime source', async () => {
    const workspaceId = randomUUID();
    const citationTarget = target();
    buildWorkspaceRunContextUseCase.execute.mockResolvedValue(
      workspaceContext({ sources: [source(citationTarget.source.id)] }),
    );

    await expect(
      executeFor(thread({ workspaceId }), citationTarget),
    ).resolves.toEqual(expectedResult(citationTarget));
  });

  it('returns a citation for a document in a workspace runtime knowledge base', async () => {
    const workspaceId = randomUUID();
    const knowledgeBaseId = randomUUID();
    const citationTarget = target({ knowledgeBaseId });
    buildWorkspaceRunContextUseCase.execute.mockResolvedValue(
      workspaceContext({ knowledgeBaseIds: [knowledgeBaseId] }),
    );

    await expect(
      executeFor(thread({ workspaceId }), citationTarget),
    ).resolves.toEqual(expectedResult(citationTarget));
  });

  it('returns the citation 404 for an unrelated source', async () => {
    await expect(executeFor(thread(), target())).rejects.toThrow(
      SourceCitationNotFoundError,
    );
  });

  it('returns the citation 404 for a system-only source', async () => {
    const citationTarget = target({ createdBy: SourceCreator.SYSTEM });

    await expect(
      executeFor(
        thread({ directSourceIds: [citationTarget.source.id] }),
        citationTarget,
      ),
    ).rejects.toThrow(SourceCitationNotFoundError);
  });

  it('returns the citation 404 for a source that is not ready', async () => {
    const citationTarget = target({ status: SourceStatus.PROCESSING });

    await expect(
      executeFor(
        thread({ directSourceIds: [citationTarget.source.id] }),
        citationTarget,
      ),
    ).rejects.toThrow(SourceCitationNotFoundError);
  });

  it('returns the citation 404 when the chunk does not exist', async () => {
    await expect(executeFor(thread(), null)).rejects.toThrow(
      SourceCitationNotFoundError,
    );
  });
});
