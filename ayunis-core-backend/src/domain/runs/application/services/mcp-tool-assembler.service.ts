import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { DiscoverMcpCapabilitiesUseCase } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case';
import { DiscoverMcpCapabilitiesQuery } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.query';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { GetMcpIntegrationsByIdsQuery } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.query';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { McpIntegrationResource } from 'src/domain/tools/domain/tools/mcp-integration-resource.entity';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import { filterDuplicateToolNames } from 'src/domain/tools/domain/tools/mcp-tool-name.util';

type McpCapability = Awaited<
  ReturnType<DiscoverMcpCapabilitiesUseCase['execute']>
>;
type McpIntegrationMeta = { name: string; logoUrl: string | null };

/**
 * Assembles MCP tools and resources for a thread's integrations. Lives
 * outside ToolAssemblyService to keep that file under the 500-line cap and
 * to keep MCP-specific logic in one place.
 */
@Injectable()
export class McpToolAssemblerService {
  private readonly logger = new Logger(McpToolAssemblerService.name);

  constructor(
    private readonly discoverMcpCapabilitiesUseCase: DiscoverMcpCapabilitiesUseCase,
    private readonly getMcpIntegrationsByIdsUseCase: GetMcpIntegrationsByIdsUseCase,
  ) {}

  /**
   * Discovers and assembles the thread's MCP tools, dropping any whose name
   * is in `reservedNames` (built-ins) or already used by another MCP tool —
   * providers reject requests with duplicate tool names, and execution
   * lookup by name would silently resolve to the wrong tool.
   */
  async assemble(
    thread: Thread,
    reservedNames: ReadonlySet<string>,
  ): Promise<Tool[]> {
    const mcpTools = await this.assembleMcpTools(thread);
    const { unique, duplicates } = filterDuplicateToolNames(
      mcpTools,
      reservedNames,
    );
    for (const duplicate of duplicates) {
      this.logger.warn(
        `Duplicate MCP tool name '${duplicate.name}', skipping later occurrence`,
      );
    }
    return unique;
  }

  private async assembleMcpTools(thread: Thread): Promise<Tool[]> {
    const mcpIntegrationIds = new Set<UUID>();
    thread.mcpIntegrationIds.forEach((id) => mcpIntegrationIds.add(id));

    if (mcpIntegrationIds.size === 0) return [];

    const integrationIdList = [...mcpIntegrationIds];

    const integrations = await this.getMcpIntegrationsByIdsUseCase.execute(
      new GetMcpIntegrationsByIdsQuery(integrationIdList),
    );
    const integrationMetaMap = this.buildMcpIntegrationMetaMap(integrations);

    const mcpResults = await Promise.allSettled(
      integrationIdList.map((integrationId) =>
        this.discoverMcpCapabilitiesUseCase.execute(
          new DiscoverMcpCapabilitiesQuery(integrationId),
        ),
      ),
    );

    const mcpCapabilities = this.collectMcpCapabilities(
      mcpResults,
      integrationIdList,
      integrationMetaMap,
    );

    return this.mapMcpCapabilitiesToTools(mcpCapabilities, integrationMetaMap);
  }

  private buildMcpIntegrationMetaMap(
    integrations: Awaited<
      ReturnType<GetMcpIntegrationsByIdsUseCase['execute']>
    >,
  ): Map<UUID, McpIntegrationMeta> {
    const integrationMetaMap = new Map<UUID, McpIntegrationMeta>();
    for (const integration of integrations) {
      integrationMetaMap.set(integration.id, {
        name: integration.name,
        logoUrl:
          integration instanceof MarketplaceMcpIntegration
            ? integration.logoUrl
            : null,
      });
    }
    return integrationMetaMap;
  }

  private collectMcpCapabilities(
    mcpResults: PromiseSettledResult<McpCapability>[],
    integrationIdList: UUID[],
    integrationMetaMap: Map<UUID, McpIntegrationMeta>,
  ): McpCapability[] {
    return mcpResults
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        const failedId = integrationIdList[index];
        const meta = integrationMetaMap.get(failedId);
        this.logger.warn(
          `MCP integration '${meta?.name ?? failedId}' unavailable, skipping`,
          {
            integrationId: failedId,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : 'Unknown error',
          },
        );
        return null;
      })
      .filter((cap): cap is McpCapability => cap !== null);
  }

  private mapMcpCapabilitiesToTools(
    mcpCapabilities: McpCapability[],
    integrationMetaMap: Map<UUID, McpIntegrationMeta>,
  ): Tool[] {
    return [
      ...mcpCapabilities.flatMap((capability) =>
        capability.tools.map((tool) => {
          const meta = integrationMetaMap.get(tool.integrationId);
          return new McpIntegrationTool(
            tool,
            capability.returnsPii,
            meta?.name ?? 'Unknown',
            meta?.logoUrl ?? null,
          );
        }),
      ),
      ...mcpCapabilities.flatMap((capability) =>
        capability.resources.map(
          (resource) =>
            new McpIntegrationResource(resource, capability.returnsPii),
        ),
      ),
    ];
  }
}
