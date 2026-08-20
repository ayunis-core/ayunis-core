import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService, ConfigType } from '@nestjs/config';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
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
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import type { Source } from 'src/domain/sources/domain/source.entity';

@Injectable()
export class ToolAssemblyService {
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
    @InjectPinoLogger(ToolAssemblyService.name)
    private readonly logger: PinoLogger,
  ) {}

  async findActiveSkills(): Promise<Skill[]> {
    return this.findActiveSkillsUseCase.execute(new FindActiveSkillsQuery());
  }

  async buildRunContext(
    thread: Thread,
    activeSkills: Skill[],
    canUseTools: boolean,
    isAnonymous: boolean,
    workspaceContext?: WorkspaceRunContext,
  ): Promise<{ tools: Tool[]; instructions: string }> {
    const skillContext = await this.prepareRunSkillContext(
      activeSkills,
      workspaceContext,
    );

    const tools = canUseTools
      ? await this.assembleTools(
          thread,
          skillContext.slugMap,
          skillContext.workspaceContext,
          skillContext.editableSkillSlugs,
        )
      : [];

    const allSources = this.collectRunSources(
      thread,
      skillContext.workspaceContext,
    );

    const { orgSystemPrompt, userSystemPrompt } =
      await this.fetchSystemPrompts();

    const instructions = this.systemPromptBuilderService.build({
      tools,
      currentTime: new Date(),
      sources: allSources,
      skills: this.resolvePromptSkills(skillContext.skillEntries, canUseTools),
      knowledgeBases: this.resolvePromptKnowledgeBases(
        thread,
        skillContext.workspaceContext,
        canUseTools,
      ),
      projectInstruction: skillContext.workspaceContext?.instruction,
      projectSkills: skillContext.projectSkills,
      orgSystemPrompt,
      userSystemPrompt,
      isAnonymous,
    });

    return { tools, instructions };
  }

  private async prepareRunSkillContext(
    activeSkills: Skill[],
    workspaceContext?: WorkspaceRunContext,
  ): Promise<{
    workspaceContext?: WorkspaceRunContext;
    projectSkills: Skill[];
    slugMap: Map<string, string>;
    editableSkillSlugs: Map<string, string>;
    skillEntries: SkillEntry[];
  }> {
    const alwaysOnTemplates = await this.fetchAlwaysOnTemplates();
    const effectiveWorkspaceContext =
      this.resolveWorkspaceContext(workspaceContext);
    const projectSkills = effectiveWorkspaceContext?.skills ?? [];
    const { slugMap, skillEntries } = this.buildSkillSlugs(
      this.excludeProjectSkills(activeSkills, projectSkills),
      alwaysOnTemplates,
    );
    const { slugMap: editableSkillSlugs } = this.buildSkillSlugs(
      activeSkills,
      alwaysOnTemplates,
    );

    return {
      workspaceContext: effectiveWorkspaceContext,
      projectSkills,
      slugMap,
      editableSkillSlugs,
      skillEntries,
    };
  }

  private resolveWorkspaceContext(
    workspaceContext?: WorkspaceRunContext,
  ): WorkspaceRunContext | undefined {
    if (!workspaceContext || this.features.skillsEnabled) {
      return workspaceContext;
    }

    return {
      ...workspaceContext,
      skills: [],
      runtimeSources: workspaceContext.sources,
      runtimeKnowledgeBases: workspaceContext.knowledgeBases,
      mcpIntegrationIds: [],
    };
  }

  private collectRunSources(
    thread: Thread,
    workspaceContext?: WorkspaceRunContext,
  ): Source[] {
    return this.mergeById(
      thread.sourceAssignments?.map((a) => a.source) ?? [],
      workspaceContext?.runtimeSources ?? [],
    );
  }

  private resolvePromptSkills(
    skillEntries: SkillEntry[],
    canUseTools: boolean,
  ): SkillEntry[] {
    if (!canUseTools || !this.features.skillsEnabled) return [];
    return skillEntries;
  }

  private excludeProjectSkills(
    activeSkills: Skill[],
    projectSkills: Skill[],
  ): Skill[] {
    const projectSkillIds = new Set(projectSkills.map((skill) => skill.id));
    return activeSkills.filter((skill) => !projectSkillIds.has(skill.id));
  }

  private resolvePromptKnowledgeBases(
    thread: Thread,
    workspaceContext: WorkspaceRunContext | undefined,
    canUseTools: boolean,
  ): KnowledgeBaseSummary[] {
    if (!canUseTools) return [];
    return this.mergeById(
      thread.getUniqueKnowledgeBases(),
      workspaceContext?.runtimeKnowledgeBases ?? [],
    );
  }

  private mergeById<T extends { id: string }>(base: T[], additional: T[]): T[] {
    const result = [...base];
    const seen = new Set(base.map((item) => item.id));
    for (const item of additional) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }
    return result;
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
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to fetch always-on templates, continuing without them',
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
            ? 'Slug collision, skipping skill'
            : 'Failed to build slug for skill, skipping';
        const detail = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn({ skillName: input.name, error: detail }, message);
      }
    }

    return { slugMap, skillEntries };
  }

  async assembleTools(
    thread: Thread,
    slugMap: Map<string, string>,
    workspaceContext?: WorkspaceRunContext,
    editableSkillSlugs: Map<string, string> = slugMap,
  ): Promise<Tool[]> {
    const tools: Tool[] = [];

    // Code execution tool is always available
    tools.push(await this.assembleCodeExecutionTool(thread, workspaceContext));

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
    // diagram and spreadsheet create/update). Handles letterhead suffix +
    // artifact context injection internally.
    tools.push(
      ...(await this.artifactToolAssembler.assembleArtifactTools(thread)),
    );

    tools.push(
      ...(await this.assembleSkillManagementTools(editableSkillSlugs)),
    );

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

    tools.push(...(await this.assembleSourceTools(thread, workspaceContext)));
    tools.push(
      ...(await this.assembleKnowledgeTools(thread, workspaceContext)),
    );
    tools.push(...(await this.assembleActivateSkillTool(slugMap)));

    // MCP tools/resources go last: their names are third-party and must not
    // shadow a built-in tool of the same name.
    const reservedNames = new Set(tools.map((tool) => tool.name));
    tools.push(
      ...(await this.mcpToolAssembler.assemble(
        thread,
        reservedNames,
        workspaceContext?.mcpIntegrationIds ?? [],
      )),
    );

    return tools;
  }

  private async assembleCodeExecutionTool(
    thread: Thread,
    workspaceContext?: WorkspaceRunContext,
  ): Promise<Tool> {
    const threadSources = this.collectRunSources(thread, workspaceContext);
    // Match the system prompt's partitioning: PROCESSING/FAILED data sources
    // are announced there as pending/failed, so advertising them here as
    // available would contradict it and steer the model into doomed calls.
    const codeExecutionSources = threadSources.filter(
      (source) =>
        source.type === SourceType.DATA && source.status === SourceStatus.READY,
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

  private async assembleSourceTools(
    thread: Thread,
    workspaceContext?: WorkspaceRunContext,
  ): Promise<Tool[]> {
    const sources = this.collectRunSources(thread, workspaceContext);
    const threadTextSources = sources.filter(
      (source): source is TextSource => source instanceof TextSource,
    );

    if (threadTextSources.length === 0) return [];

    return Promise.all(
      [ToolType.SOURCE_QUERY, ToolType.SOURCE_GET_TEXT].map((type) =>
        this.assembleToolsUseCase.execute(
          new AssembleToolCommand({ type, context: threadTextSources }),
        ),
      ),
    );
  }

  private async assembleKnowledgeTools(
    thread: Thread,
    workspaceContext?: WorkspaceRunContext,
  ): Promise<Tool[]> {
    const knowledgeBases = this.mergeById(
      thread.getUniqueKnowledgeBases(),
      workspaceContext?.runtimeKnowledgeBases ?? [],
    );
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
