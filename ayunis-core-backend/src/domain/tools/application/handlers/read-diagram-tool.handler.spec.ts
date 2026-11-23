import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ReadDiagramToolHandler } from './read-diagram-tool.handler';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { ReadDiagramTool } from 'src/domain/tools/domain/tools/read-diagram-tool.entity';
import {
  DiagramArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactNotFoundError } from 'src/domain/artifacts/application/artifacts.errors';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import toolsConfig from 'src/config/tools.config';

describe('ReadDiagramToolHandler', () => {
  let handler: ReadDiagramToolHandler;
  let findArtifactUseCase: jest.Mocked<FindArtifactWithVersionsUseCase>;

  const threadId = randomUUID();
  const orgId = randomUUID();
  const userId = randomUUID();
  const artifactId = randomUUID();
  const tool = new ReadDiagramTool();

  beforeEach(async () => {
    findArtifactUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindArtifactWithVersionsUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadDiagramToolHandler,
        {
          provide: FindArtifactWithVersionsUseCase,
          useValue: findArtifactUseCase,
        },
        {
          provide: toolsConfig.KEY,
          useValue: { sourceGetText: { maxLines: 200, maxChars: 5000 } },
        },
      ],
    }).compile();

    handler = module.get(ReadDiagramToolHandler);
  });

  function version(versionNumber: number, content: string): ArtifactVersion {
    return new ArtifactVersion({
      artifactId,
      versionNumber,
      content,
      authorType: AuthorType.USER,
      authorId: userId,
    });
  }

  function read(input: Record<string, unknown> = {}): Promise<string> {
    return handler.execute({
      tool,
      input: { artifact_id: artifactId, ...input },
      context: { threadId, orgId },
    });
  }

  it('returns the mermaid source of the current version, not an older one', async () => {
    findArtifactUseCase.execute.mockResolvedValue(
      new DiagramArtifact({
        id: artifactId,
        threadId,
        userId,
        title: 'Antragsprozess',
        currentVersionNumber: 2,
        versions: [
          version(1, 'flowchart TD\n  A --> B'),
          version(2, 'flowchart TD\n  A --> B\n  B --> C'),
        ],
      }),
    );

    expect(JSON.parse(await read())).toMatchObject({
      artifactId,
      title: 'Antragsprozess',
      version: 2,
      content: 'flowchart TD\n  A --> B\n  B --> C',
      truncated: false,
      nextPage: null,
    });
  });

  it('points the model to read_spreadsheet when the artifact is a spreadsheet', async () => {
    findArtifactUseCase.execute.mockResolvedValue(
      new SpreadsheetArtifact({
        id: artifactId,
        threadId,
        userId,
        title: 'Haushalt',
        versions: [version(1, '{}')],
      }),
    );

    await expect(read()).rejects.toThrow('Use read_spreadsheet to read it');
  });

  it('reports an artifact the user cannot access as not found to the model', async () => {
    findArtifactUseCase.execute.mockRejectedValue(
      new ArtifactNotFoundError(artifactId),
    );

    const error = await read().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ToolExecutionFailedError);
    expect((error as ToolExecutionFailedError).exposeToLLM).toBe(true);
    expect((error as ToolExecutionFailedError).message).toContain('not found');
  });
});
