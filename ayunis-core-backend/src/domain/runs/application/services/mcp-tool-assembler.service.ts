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
import { isMcpConnectivityOutage } from 'src/domain/mcp/application/mcp.errors';
import { reportUnexpectedError } from 'src/common/errors/report-unexpected-error.helper';

type McpCapability = Awaited<
  ReturnType<DiscoverMcpCapabilitiesUseCase['execute']>
>;
type McpIntegrationMeta = {
  name: string;
  logoUrl: string | null;
  instructions: string | null;
};

export interface McpIntegrationInstructions {
  readonly integrationId: UUID;
  readonly integrationName: string;
  readonly instructions: string;
}

export interface McpAssembly {
  readonly tools: Tool[];
  /**
   * Admin instructions of the integrations that contributed at least one
   * tool, ordered by integration id so the prompt stays stable across runs.
   */
  readonly integrationInstructions: McpIntegrationInstructions[];
}

/**
 * Assembles MCP tools and resources for a thread's integrations, used by
 * `McpCapability`.
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
  ): Promise<McpAssembly> {
    const { tools: mcpTools, integrationMetaMap } =
      await this.assembleMcpTools(thread);
    const { unique, duplicates } = McpToolAssemblerService.filterDuplicateNames(
      mcpTools,
      reservedNames,
    );
    for (const duplicate of duplicates) {
      this.logger.warn(
        { toolName: duplicate.name },
        'Duplicate MCP tool name, skipping later occurrence',
      );
    }
    return {
      tools: unique,
      integrationInstructions: McpToolAssemblerService.collectInstructions(
        unique,
        integrationMetaMap,
      ),
    };
  }

  private static collectInstructions(
    tools: Tool[],
    integrationMetaMap: Map<UUID, McpIntegrationMeta>,
  ): McpIntegrationInstructions[] {
    const assembledIntegrationIds = new Set<UUID>();
    for (const tool of tools) {
      if (
        tool instanceof McpIntegrationTool ||
        tool instanceof McpIntegrationResource
      ) {
        assembledIntegrationIds.add(tool.integrationId);
      }
    }
    return [...assembledIntegrationIds]
      .sort((a, b) => a.localeCompare(b))
      .flatMap((integrationId) => {
        const meta = integrationMetaMap.get(integrationId);
        return meta?.instructions
          ? [
              {
                integrationId,
                integrationName: meta.name,
                instructions: meta.instructions,
              },
            ]
          : [];
      });
  }

  /**
   * Keeps the first occurrence of each name; the rest are returned so the
   * caller can log what was dropped. `reservedNames` marks names already
   * taken by other tools (built-ins) — entries carrying one count as
   * duplicates.
   */
  private static filterDuplicateNames<T extends { name: string }>(
    tools: T[],
    reservedNames: ReadonlySet<string>,
  ): { unique: T[]; duplicates: T[] } {
    const seen = new Set<string>(reservedNames);
    const unique: T[] = [];
    const duplicates: T[] = [];
    for (const tool of tools) {
      if (seen.has(tool.name)) {
        duplicates.push(tool);
      } else {
        seen.add(tool.name);
        unique.push(tool);
      }
    }
    return { unique, duplicates };
  }

  private async assembleMcpTools(thread: Thread): Promise<{
    tools: Tool[];
    integrationMetaMap: Map<UUID, McpIntegrationMeta>;
  }> {
    const mcpIntegrationIds = new Set<UUID>();
    thread.mcpIntegrationIds.forEach((id) => mcpIntegrationIds.add(id));

    if (mcpIntegrationIds.size === 0) {
      return { tools: [], integrationMetaMap: new Map() };
    }

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

    return {
      tools: this.mapMcpCapabilitiesToTools(
        mcpCapabilities,
        integrationMetaMap,
      ),
      integrationMetaMap,
    };
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
        instructions: integration.instructions,
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
          {
            integrationId: failedId,
            integrationName: meta?.name,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : 'Unknown error',
          },
          'MCP integration unavailable, skipping',
        );
        // The skip is the only place run-time discovery outages surface, and
        // their raw transport duplicates are suppressed AppSignal-side
        // (AYC-616) — report the classified failure or the outage is
        // invisible, often before any tool call runs.
        if (isMcpConnectivityOutage(result.reason)) {
          reportUnexpectedError(result.reason);
        }
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
        capability.resources.map((resource) => {
          const meta = integrationMetaMap.get(resource.integrationId);
          return new McpIntegrationResource(
            resource,
            capability.returnsPii,
            meta?.name ?? 'Unknown',
            meta?.logoUrl ?? null,
          );
        }),
      ),
    ];
  }
}
