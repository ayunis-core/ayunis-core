import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { WorkspaceRunContextResolverService } from './workspace-run-context-resolver.service';

describe('WorkspaceRunContextResolverService', () => {
  it('resolves empty workspace references', async () => {
    const service = new WorkspaceRunContextResolverService(
      createPinoLoggerMock(),
      { execute: jest.fn() } as never,
      { execute: jest.fn().mockResolvedValue([]) } as never,
      { execute: jest.fn().mockResolvedValue([]) } as never,
      {
        countSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue(new Map()),
      } as never,
    );

    await expect(
      service.resolve({ skillIds: [], knowledgeBases: [], sourceIds: [] }),
    ).resolves.toEqual({
      skills: [],
      knowledgeBases: [],
      sources: [],
      runtimeKnowledgeBases: [],
      runtimeSources: [],
      mcpIntegrationIds: [],
    });
  });
});
