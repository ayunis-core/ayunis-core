import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { GetMcpIntegrationsByIdsQuery } from './get-mcp-integrations-by-ids.query';
import { GetMcpIntegrationsByIdsUseCase } from './get-mcp-integrations-by-ids.use-case';

describe('GetMcpIntegrationsByIdsUseCase', () => {
  it("never returns another organization's integration, so its instructions cannot reach a run", async () => {
    const orgId = randomUUID();
    const own = aCustomMcpIntegration({
      orgId,
      instructions: 'Search by surname before using the address.',
    });
    const foreign = aCustomMcpIntegration({
      orgId: randomUUID(),
      instructions: 'Instructions of another organization.',
    });
    const useCase = new GetMcpIntegrationsByIdsUseCase(
      {
        findByIds: jest.fn().mockResolvedValue([own, foreign]),
      } as unknown as McpIntegrationsRepositoryPort,
      { get: jest.fn().mockReturnValue(orgId) } as unknown as ContextService,
    );

    const integrations = await useCase.execute(
      new GetMcpIntegrationsByIdsQuery([own.id, foreign.id]),
    );

    expect(integrations).toEqual([own]);
  });
});
