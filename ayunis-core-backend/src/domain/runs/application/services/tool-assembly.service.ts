import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class ToolAssemblyService {
  private readonly logger = new Logger(ToolAssemblyService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly assembleToolsUseCase: AssembleToolUseCase,
    private readonly discoverMcpCapabilitiesUseCase: DiscoverMcpCapabilitiesUseCase,
    private readonly systemPromptBuilderService: SystemPromptBuilderService,
    private readonly findActiveSkillsUseCase: FindActiveSkillsUseCase,
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
    const tools = canUseTools
      ? await this.assembleTools(thread, agent, activeSkills)
      : [];

    // Collect all sources from thread and agent for the system prompt
    // Filter to only TextSources since DataSources (e.g., CSV) can only be used
    // with code_execution tool, not source_query or source_get_text
    const allSources = [
      ...(thread.sourceAssignments?.map((a) => a.source) ?? []),
      ...(agent?.sourceAssignments?.map((a) => a.source) ?? []),
    ];
    const textSources = allSources.filter(
      (s): s is TextSource => s instanceof TextSource,
    );

    const instructions = this.systemPromptBuilderService.build({
      agent,
      tools,
      currentTime: new Date(),
      sources: textSources,
      skills: activeSkills,
    });

    return { tools, instructions };
  }

  async assembleTools(
    thread: Thread,
    agent?: Agent,
    activeSkills: Skill[] = [],
  ): Promise<Tool[]> {
    const isSelfhosted = this.configService.get<boolean>('app.isSelfHosted');
    const isCloudHosted = this.configService.get<boolean>('app.isCloudHosted');
    const tools: Tool[] = [];

    // Collect MCP integration IDs from agent and thread (skill-injected)
    const mcpIntegrationIds = new Set<UUID>();
    if (agent) {
      agent.mcpIntegrationIds.forEach((id) => mcpIntegrationIds.add(id));
    }
    thread.mcpIntegrationIds.forEach((id) => mcpIntegrationIds.add(id));

    // Discover MCP capabilities from all integration IDs
    if (mcpIntegrationIds.size > 0) {
      const mcpCapabilities = await Promise.all(
        [...mcpIntegrationIds].map((integrationId) =>
          this.discoverMcpCapabilitiesUseCase.execute(
            new DiscoverMcpCapabilitiesQuery(integrationId),
          ),
        ),
      );
      // Add MCP tools and resources
      tools.push(
        ...mcpCapabilities.flatMap((capability) =>
          capability.tools.map(
            (tool) => new McpIntegrationTool(tool, capability.returnsPii),
          ),
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
    const agentSources = agent?.sourceAssignments?.map(
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

    // Internet search tool is always available
    if (
      isCloudHosted ||
      (isSelfhosted &&
        this.configService.get<boolean>('internetSearch.isAvailable'))
    ) {
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

    // Activate skill tool is available if there are active skills
    if (activeSkills.length > 0) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.ACTIVATE_SKILL,
            context: activeSkills,
          }),
        ),
      );
    }

    return tools;
  }
}
