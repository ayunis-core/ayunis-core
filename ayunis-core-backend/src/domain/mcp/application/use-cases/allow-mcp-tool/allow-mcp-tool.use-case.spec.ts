import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationAccessDeniedError } from 'src/domain/mcp/application/mcp.errors';
import type { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import type { McpToolAllowanceRepositoryPort } from 'src/domain/mcp/application/ports/mcp-tool-allowance.repository.port';
import { ValidateIntegrationAccessService } from 'src/domain/mcp/application/services/validate-integration-access.service';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { AllowMcpToolCommand } from './allow-mcp-tool.command';
import { AllowMcpToolUseCase } from './allow-mcp-tool.use-case';

describe('AllowMcpToolUseCase', () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  let integrations: jest.Mocked<
    Pick<McpIntegrationsRepositoryPort, 'findById'>
  >;
  let allowances: jest.Mocked<McpToolAllowanceRepositoryPort>;
  let useCase: AllowMcpToolUseCase;

  beforeEach(() => {
    const context = {
      get: jest.fn(
        (key: string) =>
          ({
            userId,
            orgId,
            role: UserRole.USER,
            systemRole: SystemRole.CUSTOMER,
          })[key],
      ),
    } as unknown as ContextService;
    integrations = { findById: jest.fn() };
    allowances = {
      saveIfAbsent: jest.fn(),
      findByUser: jest.fn(),
      findByUserAndIntegrationIds: jest.fn(),
      deleteByIdAndUser: jest.fn(),
    };
    useCase = new AllowMcpToolUseCase(
      allowances,
      new ValidateIntegrationAccessService(
        integrations as unknown as McpIntegrationsRepositoryPort,
        context,
      ),
      context,
    );
  });

  it('stores the allowance for the authenticated user', async () => {
    const integration = aCustomMcpIntegration({ orgId, enabled: false });
    integrations.findById.mockResolvedValue(integration);

    await useCase.execute(
      new AllowMcpToolCommand(integration.id, 'search_meetings'),
    );

    const saved = allowances.saveIfAbsent.mock.calls[0][0];
    expect(saved).toMatchObject({
      userId,
      integrationId: integration.id,
      toolName: 'search_meetings',
    });
  });

  it("refuses to allow a tool of another organization's integration", async () => {
    const integration = aCustomMcpIntegration({ orgId: randomUUID() });
    integrations.findById.mockResolvedValue(integration);

    await expect(
      useCase.execute(
        new AllowMcpToolCommand(integration.id, 'search_meetings'),
      ),
    ).rejects.toThrow(McpIntegrationAccessDeniedError);
    expect(allowances.saveIfAbsent).not.toHaveBeenCalled();
  });
});
