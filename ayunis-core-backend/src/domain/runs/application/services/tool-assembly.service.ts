import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SystemPromptBuilderService } from './system-prompt-builder.service';
import { FindActiveSkillsUseCase } from 'src/domain/skills/application/use-cases/find-active-skills/find-active-skills.use-case';
import { FindActiveSkillsQuery } from 'src/domain/skills/application/use-cases/find-active-skills/find-active-skills.query';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { GetUserSystemPromptUseCase } from 'src/domain/chat-settings/application/use-cases/get-user-system-prompt/get-user-system-prompt.use-case';
import { GetOrgSystemPromptUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-system-prompt/get-org-system-prompt.use-case';
import { GetOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
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
import { assembleImageGenerationTools } from './image-generation-tool-assembly.helper';
import { ContextService } from 'src/common/context/services/context.service';
import { GetPermittedImageGenerationModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.use-case';
import { ArtifactToolAssemblerService } from './artifact-tool-assembler.service';
import { McpToolAssemblerService } from './mcp-tool-assembler.service';

@Injectable()
export class ToolAssemblyService {
  private readonly logger = new Logger(ToolAssemblyService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly assembleToolsUseCase: AssembleToolUseCase,
    private readonly mcpToolAssembler: McpToolAssemblerService,
    private readonly systemPromptBuilderService: SystemPromptBuilderService,
    private readonly findActiveSkillsUseCase: FindActiveSkillsUseCase,
    private readonly getUserSystemPromptUseCase: GetUserSystemPromptUseCase,
    private readonly getOrgSystemPromptUseCase: GetOrgSystemPromptUseCase,
    private readonly findActiveAlwaysOnTemplatesUseCase: FindActiveAlwaysOnTemplatesUseCase,
    @Inject(featuresConfig.KEY)
    private readonly features: ConfigType<typeof featuresConfig>,
    private readonly contextService: ContextService,
    private readonly getPermittedImageGenerationModelUseCase: GetPermittedImageGenerationModelUseCase,
    private readonly artifactToolAssembler: ArtifactToolAssemblerService,
    private readonly getOrgChatSettingsUseCase: GetOrgChatSettingsUseCase,
  ) {}

  async findActiveSkills(): Promise<Skill[]> {
    return this.findActiveSkillsUseCase.execute(new FindActiveSkillsQuery());
  }

  async buildRunContext(
    thread: Thread,
    activeSkills: Skill[],
    canUseTools: boolean,
    isAnonymous: boolean,
  ): Promise<{ tools: Tool[]; instructions: string }> {
    const alwaysOnTemplates = await this.fetchAlwaysOnTemplates();

    const { slugMap, skillEntries } = this.buildSkillSlugs(
      activeSkills,
      alwaysOnTemplates,
    );

    const tools = canUseTools
      ? await this.assembleTools(thread, activeSkills, slugMap)
      : [];

    // Collect all sources from thread for the system prompt.
    // All types and statuses are passed — the system prompt builder partitions
    // them into ready / processing / failed sections.
    const allSources = thread.sourceAssignments?.map((a) => a.source) ?? [];

    const { orgSystemPrompt, userSystemPrompt } =
      await this.fetchSystemPrompts();

    const instructions = this.systemPromptBuilderService.build({
      tools,
      currentTime: new Date(),
      sources: allSources,
      // Only include skills in prompt when tools are enabled and skills feature is on,
      // otherwise the prompt would instruct the model to use activate_skill which isn't available
      skills: canUseTools && this.features.skillsEnabled ? skillEntries : [],
      knowledgeBases: canUseTools ? thread.getUniqueKnowledgeBases() : [],
      orgSystemPrompt,
      userSystemPrompt,
      isAnonymous,
    });

    return { tools, instructions };
  }

  /**
   * Fetch always-on skill templates (cached, 60s TTL). Failures are swallowed
   * so a templates outage never blocks a run.
   */
  private async fetchAlwaysOnTemplates(): Promise<SkillTemplate[]> {
    try {
      return await this.findActiveAlwaysOnTemplatesUseCase.execute(
        new FindActiveAlwaysOnTemplatesQuery(),
      );
    } catch (error) {
      this.logger.error(
        'Failed to fetch always-on templates, continuing without them',
        { error: error instanceof Error ? error.message : 'Unknown error' },
      );
      return [];
    }
  }

  /**
   * Fetch the org-wide and the user's custom system prompts (undefined when
   * not configured).
   */
  private async fetchSystemPrompts(): Promise<{
    orgSystemPrompt: string | undefined;
    userSystemPrompt: string | undefined;
  }> {
    const orgSystemPromptEntity =
      await this.getOrgSystemPromptUseCase.execute();
    const userSystemPromptEntity =
      await this.getUserSystemPromptUseCase.execute();
    return {
      orgSystemPrompt: orgSystemPromptEntity?.systemPrompt ?? undefined,
      userSystemPrompt: userSystemPromptEntity?.systemPrompt ?? undefined,
    };
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

    type SkillInput = {
      name: string;
      prefix: SkillPrefix;
      description: string;
    };
    const allInputs: SkillInput[] = [
      ...activeSkills.map((s): SkillInput => ({
        name: s.name,
        prefix: USER_PREFIX,
        description: s.shortDescription,
      })),
      ...alwaysOnTemplates.map((t): SkillInput => ({
        name: t.name,
        prefix: SYSTEM_PREFIX,
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
    _activeSkills: Skill[],
    slugMap: Map<string, string>,
  ): Promise<Tool[]> {
    const tools: Tool[] = [];

    // Code execution tool is always available
    tools.push(await this.assembleCodeExecutionTool(thread));

    // Always-available tools
    tools.push(
      ...(await this.assembleSimpleTools([
        ToolType.SEND_EMAIL,
        ToolType.CREATE_CALENDAR_EVENT,
        ToolType.BAR_CHART,
        ToolType.LINE_CHART,
        ToolType.PIE_CHART,
      ])),
    );

    // Artifact-related always-on tools (document create/update/edit/read +
    // diagram create/update). Handles letterhead suffix + artifact context
    // injection internally.
    tools.push(
      ...(await this.artifactToolAssembler.assembleDocumentAndDiagramTools(
        thread,
      )),
    );

    tools.push(...(await this.assembleSkillManagementTools(slugMap)));

    // Internet tools (website content + search) — gated by the org chat setting
    tools.push(...(await this.assembleInternetTools()));

    // Image generation tool — available when org has a permitted image model
    tools.push(
      ...(await assembleImageGenerationTools({
        orgId: this.contextService.get('orgId'),
        getPermittedImageGenerationModelUseCase:
          this.getPermittedImageGenerationModelUseCase,
        assembleToolsUseCase: this.assembleToolsUseCase,
        logger: this.logger,
      })),
    );

    tools.push(...(await this.assembleSourceTools(thread)));
    tools.push(...(await this.assembleKnowledgeTools(thread)));
    tools.push(...(await this.assembleActivateSkillTool(slugMap)));

    // MCP tools/resources go last: their names are third-party and must not
    // shadow a built-in tool of the same name.
    const reservedNames = new Set(tools.map((tool) => tool.name));
    tools.push(
      ...(await this.mcpToolAssembler.assemble(thread, reservedNames)),
    );

    return tools;
  }

  private async assembleCodeExecutionTool(thread: Thread): Promise<Tool> {
    const threadSources =
      thread.sourceAssignments?.map((assignment) => assignment.source) ?? [];
    const codeExecutionSources = threadSources.filter(
      (source) => source.type === SourceType.DATA,
    );
    return this.assembleToolsUseCase.execute(
      new AssembleToolCommand({
        type: ToolType.CODE_EXECUTION,
        context: codeExecutionSources,
      }),
    );
  }

  private async assembleSimpleTools(types: ToolType[]): Promise<Tool[]> {
    return Promise.all(
      types.map((type) =>
        this.assembleToolsUseCase.execute(new AssembleToolCommand({ type })),
      ),
    );
  }

  private async assembleSkillManagementTools(
    slugMap: Map<string, string>,
  ): Promise<Tool[]> {
    if (!this.features.skillsEnabled) return [];

    const tools: Tool[] = [
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({ type: ToolType.CREATE_SKILL }),
      ),
    ];

    const userSlugs = [...slugMap.keys()].filter((s) =>
      s.startsWith(`${USER_PREFIX}__`),
    );
    if (userSlugs.length > 0) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.EDIT_SKILL,
            context: userSlugs,
          }),
        ),
      );
    }
    return tools;
  }

  /**
   * Internet access tools: website content reading and web search. Both are
   * omitted entirely when the organization has disabled internet access in its
   * chat settings. Web search additionally requires the provider to be
   * configured (`internetSearch.isAvailable`).
   */
  private async assembleInternetTools(): Promise<Tool[]> {
    const orgChatSettings = await this.getOrgChatSettingsUseCase.execute();
    if (!orgChatSettings.internetSearchEnabled) {
      this.logger.debug('Internet access disabled for org, skipping web tools');
      return [];
    }

    const tools: Tool[] = [
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({ type: ToolType.WEBSITE_CONTENT }),
      ),
    ];

    if (this.configService.get<boolean>('internetSearch.isAvailable')) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({ type: ToolType.INTERNET_SEARCH }),
        ),
      );
    }
    return tools;
  }

  private async assembleSourceTools(thread: Thread): Promise<Tool[]> {
    const threadTextSources = (thread.sourceAssignments ?? [])
      .map((assignment) => assignment.source)
      .filter((source): source is TextSource => source instanceof TextSource);

    if (threadTextSources.length === 0) return [];

    return Promise.all(
      [ToolType.SOURCE_QUERY, ToolType.SOURCE_GET_TEXT].map((type) =>
        this.assembleToolsUseCase.execute(
          new AssembleToolCommand({ type, context: threadTextSources }),
        ),
      ),
    );
  }

  private async assembleKnowledgeTools(thread: Thread): Promise<Tool[]> {
    const knowledgeBases = thread.getUniqueKnowledgeBases();
    if (knowledgeBases.length === 0) return [];

    return Promise.all(
      [ToolType.KNOWLEDGE_QUERY, ToolType.KNOWLEDGE_GET_TEXT].map((type) =>
        this.assembleToolsUseCase.execute(
          new AssembleToolCommand({ type, context: knowledgeBases }),
        ),
      ),
    );
  }

  private async assembleActivateSkillTool(
    slugMap: Map<string, string>,
  ): Promise<Tool[]> {
    if (!this.features.skillsEnabled || slugMap.size === 0) return [];
    return [
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.ACTIVATE_SKILL,
          context: slugMap,
        }),
      ),
    ];
  }
}
