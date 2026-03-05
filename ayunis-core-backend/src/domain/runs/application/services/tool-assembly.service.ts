import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { UUID } from 'crypto';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { DiscoverMcpCapabilitiesUseCase } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case';
import { DiscoverMcpCapabilitiesQuery } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.query';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { McpIntegrationResource } from 'src/domain/tools/domain/tools/mcp-integration-resource.entity';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SystemPromptBuilderService } from './system-prompt-builder.service';
import { FindActiveSkillsUseCase } from 'src/domain/skills/application/use-cases/find-active-skills/find-active-skills.use-case';
import { FindActiveSkillsQuery } from 'src/domain/skills/application/use-cases/find-active-skills/find-active-skills.query';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { GetUserSystemPromptUseCase } from 'src/domain/chat-settings/application/use-cases/get-user-system-prompt/get-user-system-prompt.use-case';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { GetMcpIntegrationsByIdsQuery } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.query';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import { FindActiveAlwaysOnTemplatesUseCase } from 'src/domain/skill-templates/application/use-cases/find-active-always-on-templates/find-active-always-on-templates.use-case';
import { FindActiveAlwaysOnTemplatesQuery } from 'src/domain/skill-templates/application/use-cases/find-active-always-on-templates/find-active-always-on-templates.query';
import { featuresConfig } from 'src/config/features.config';
import {
  buildSkillSlug,
  SlugCollisionError,
  SYSTEM_PREFIX,
  USER_PREFIX,
  type SkillEntry,
  type SkillPrefix,
} from 'src/common/util/skill-slug';
import type { SkillTemplate } from 'src/domain/skill-templates/domain/skill-template.entity';

@Injectable()
export class ToolAssemblyService {
  private readonly logger = new Logger(ToolAssemblyService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly assembleToolsUseCase: AssembleToolUseCase,
    private readonly discoverMcpCapabilitiesUseCase: DiscoverMcpCapabilitiesUseCase,
    private readonly systemPromptBuilderService: SystemPromptBuilderService,
    private readonly findActiveSkillsUseCase: FindActiveSkillsUseCase,
    private readonly getUserSystemPromptUseCase: GetUserSystemPromptUseCase,
    private readonly getMcpIntegrationsByIdsUseCase: GetMcpIntegrationsByIdsUseCase,
    private readonly findActiveAlwaysOnTemplatesUseCase: FindActiveAlwaysOnTemplatesUseCase,
    @Inject(featuresConfig.KEY)
    private readonly features: ConfigType<typeof featuresConfig>,
  ) {}

  async findActiveSkills(): Promise<Skill[]> {
    return this.findActiveSkillsUseCase.execute(new FindActiveSkillsQuery());
  }

  async buildRunContext(
    thread: Thread,
    agent: Agent | undefined,
    activeSkills: Skill[],
    canUseTools: boolean,
  ): Promise<{ tools: Tool[]; instructions: string }> {
    // Fetch always-on skill templates (cached, 60s TTL)
    let alwaysOnTemplates: SkillTemplate[] = [];
    try {
      alwaysOnTemplates = await this.findActiveAlwaysOnTemplatesUseCase.execute(
        new FindActiveAlwaysOnTemplatesQuery(),
      );
    } catch (error) {
      this.logger.error(
        'Failed to fetch always-on templates, continuing without them',
        { error: error instanceof Error ? error.message : 'Unknown error' },
      );
    }

    const { slugMap, skillEntries } = this.buildSkillSlugs(
      activeSkills,
      alwaysOnTemplates,
    );

    const tools = canUseTools
      ? await this.assembleTools(thread, agent, activeSkills, slugMap)
      : [];

    // Collect all sources from thread and agent for the system prompt
    // Filter to only TextSources since DataSources (e.g., CSV) can only be used
    // with code_execution tool, not source_query or source_get_text
    const allSources = [
      ...(thread.sourceAssignments?.map((a) => a.source) ?? []),
      ...(agent?.sourceAssignments.map((a) => a.source) ?? []),
    ];
    const textSources = allSources.filter(
      (s): s is TextSource => s instanceof TextSource,
    );

    // Fetch user's custom system prompt (returns null if not configured)
    const userSystemPromptEntity =
      await this.getUserSystemPromptUseCase.execute();
    const userSystemPrompt = userSystemPromptEntity?.systemPrompt ?? undefined;

    const instructions = this.systemPromptBuilderService.build({
      agent,
      tools,
      currentTime: new Date(),
      sources: textSources,
      // Only include skills in prompt when tools are enabled and skills feature is on,
      // otherwise the prompt would instruct the model to use activate_skill which isn't available
      skills: canUseTools && this.features.skillsEnabled ? skillEntries : [],
      knowledgeBases: canUseTools ? (thread.knowledgeBases ?? []) : [],
      userSystemPrompt,
    });

    return { tools, instructions };
  }

  /**
   * Build slug→name map and skill entries in a single pass.
   * Errors are handled per-entry so a single problematic skill
   * (collision or un-slugifiable name) only removes that entry.
   */
  private buildSkillSlugs(
    activeSkills: Skill[],
    alwaysOnTemplates: SkillTemplate[],
  ): { slugMap: Map<string, string>; skillEntries: SkillEntry[] } {
    const slugMap = new Map<string, string>();
    const skillEntries: SkillEntry[] = [];

    const allInputs: {
      name: string;
      prefix: SkillPrefix;
      description: string;
    }[] = [
      ...activeSkills.map((s) => ({
        name: s.name,
        prefix: USER_PREFIX as SkillPrefix,
        description: s.shortDescription,
      })),
      ...alwaysOnTemplates.map((t) => ({
        name: t.name,
        prefix: SYSTEM_PREFIX as SkillPrefix,
        description: t.shortDescription,
      })),
    ];

    for (const input of allInputs) {
      try {
        const slug = buildSkillSlug(input.prefix, input.name);
        const existing = slugMap.get(slug);
        if (existing !== undefined && existing !== input.name) {
          throw new SlugCollisionError(slug, existing, input.name);
        }
        slugMap.set(slug, input.name);
        skillEntries.push({ slug, description: input.description });
      } catch (error) {
        const message =
          error instanceof SlugCollisionError
            ? `Slug collision, skipping skill "${input.name}"`
            : `Failed to build slug for skill "${input.name}", skipping`;
        const detail = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(message, { error: detail });
      }
    }

    return { slugMap, skillEntries };
  }

  async assembleTools(
    thread: Thread,
    agent: Agent | undefined,
    activeSkills: Skill[],
    slugMap: Map<string, string>,
  ): Promise<Tool[]> {
    const skillsEnabled = this.features.skillsEnabled;
    const tools: Tool[] = [];

    // Collect MCP integration IDs from agent and thread (skill-injected)
    const mcpIntegrationIds = new Set<UUID>();
    if (agent) {
      agent.mcpIntegrationIds.forEach((id) => mcpIntegrationIds.add(id));
    }
    thread.mcpIntegrationIds.forEach((id) => mcpIntegrationIds.add(id));

    // Discover MCP capabilities from all integration IDs
    if (mcpIntegrationIds.size > 0) {
      const integrationIdList = [...mcpIntegrationIds];

      // Fetch integration entities for metadata (name, logoUrl)
      const integrations = await this.getMcpIntegrationsByIdsUseCase.execute(
        new GetMcpIntegrationsByIdsQuery(integrationIdList),
      );
      const integrationMetaMap = new Map<
        UUID,
        { name: string; logoUrl: string | null }
      >();
      for (const integration of integrations) {
        integrationMetaMap.set(integration.id, {
          name: integration.name,
          logoUrl:
            integration instanceof MarketplaceMcpIntegration
              ? integration.logoUrl
              : null,
        });
      }

      const mcpResults = await Promise.allSettled(
        integrationIdList.map((integrationId) =>
          this.discoverMcpCapabilitiesUseCase.execute(
            new DiscoverMcpCapabilitiesQuery(integrationId),
          ),
        ),
      );

      // Filter successful results, log and skip failures
      const mcpCapabilities = mcpResults
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
        .filter((cap): cap is NonNullable<typeof cap> => cap !== null);

      // Add MCP tools and resources
      tools.push(
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
      );
    }

    if (agent) {
      // Add native tools from the agent (excluding always-available tools)
      tools.push(
        ...agent.tools.filter(
          (tool) =>
            tool.type !== ToolType.INTERNET_SEARCH &&
            tool.type !== ToolType.BAR_CHART &&
            tool.type !== ToolType.LINE_CHART &&
            tool.type !== ToolType.PIE_CHART,
        ),
      );
    }

    // Code execution tool is always available
    const threadSources = thread.sourceAssignments?.map(
      (assignment) => assignment.source,
    );
    const agentSources = agent?.sourceAssignments.map(
      (assignment) => assignment.source,
    );
    const codeExecutionSources = [
      ...(threadSources ?? []),
      ...(agentSources ?? []),
    ].filter((source) => source.type === SourceType.DATA);
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.CODE_EXECUTION,
          context: codeExecutionSources,
        }),
      ),
    );

    // Website content tool is always available
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.WEBSITE_CONTENT,
        }),
      ),
    );

    // E-Mail tool is always available
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.SEND_EMAIL,
        }),
      ),
    );

    // Calendar event tool is always available
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.CREATE_CALENDAR_EVENT,
        }),
      ),
    );

    // Chart tools are always available
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.BAR_CHART,
        }),
      ),
    );
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.LINE_CHART,
        }),
      ),
    );
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.PIE_CHART,
        }),
      ),
    );

    // Product knowledge tool is always available
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.PRODUCT_KNOWLEDGE,
        }),
      ),
    );

    // Create skill tool is available when skills feature is enabled
    if (skillsEnabled) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.CREATE_SKILL,
          }),
        ),
      );
    }

    // Internet search tool is available when Brave Search credentials are configured
    if (this.configService.get<boolean>('internetSearch.isAvailable')) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.INTERNET_SEARCH,
          }),
        ),
      );
    }

    // Collect text sources from both thread and agent
    const threadTextSources = (thread.sourceAssignments ?? [])
      .map((assignment) => assignment.source)
      .filter((source): source is TextSource => source instanceof TextSource);

    const agentTextSources = (agent?.sourceAssignments ?? [])
      .map((assignment) => assignment.source)
      .filter((source): source is TextSource => source instanceof TextSource);

    const allTextSources = [...threadTextSources, ...agentTextSources];

    // Source query and source get text tools are available if there are text sources
    if (allTextSources.length > 0) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.SOURCE_QUERY,
            context: allTextSources,
          }),
        ),
      );

      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.SOURCE_GET_TEXT,
            context: allTextSources,
          }),
        ),
      );
    }

    // Knowledge base tools are available if the thread has knowledge bases

    if ((thread.knowledgeBases?.length ?? 0) > 0) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.KNOWLEDGE_QUERY,
            context: thread.knowledgeBases,
          }),
        ),
      );

      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.KNOWLEDGE_GET_TEXT,
            context: thread.knowledgeBases,
          }),
        ),
      );
    }

    // Activate skill tool is available if there are activatable skills (user or system) and skills feature is enabled
    if (skillsEnabled && slugMap.size > 0) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.ACTIVATE_SKILL,
            context: slugMap,
          }),
        ),
      );
    }

    return tools;
  }
}
