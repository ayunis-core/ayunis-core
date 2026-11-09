import type { UUID } from 'crypto';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ArtifactToolAssemblerService } from 'src/domain/runs/application/services/artifact-tool-assembler.service';
import { McpToolAssemblerService } from 'src/domain/runs/application/services/mcp-tool-assembler.service';
import { RunCapabilityContextFactory } from 'src/domain/runs/application/run-capabilities/run-capability-context.factory';
import { AnonymizationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization.capability';
import { ArtifactsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/artifacts.capability';
import { BehaviorCapability } from 'src/domain/runs/application/run-capabilities/capabilities/behavior.capability';
import { CodeExecutionCapability } from 'src/domain/runs/application/run-capabilities/capabilities/code-execution.capability';
import { CustomInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/custom-instructions.capability';
import { DataHandlingCapability } from 'src/domain/runs/application/run-capabilities/capabilities/data-handling.capability';
import { DateTimeCapability } from 'src/domain/runs/application/run-capabilities/capabilities/date-time.capability';
import { EmailCalendarCapability } from 'src/domain/runs/application/run-capabilities/capabilities/email-calendar.capability';
import { FilesChartsMapCapability } from 'src/domain/runs/application/run-capabilities/capabilities/files-charts-map.capability';
import { ImageGenerationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/image-generation.capability';
import { InternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/internet.capability';
import { KnowledgeBasesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/knowledge-bases.capability';
import { LegalReferencesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/legal-references.capability';
import { MarketplaceCapability } from 'src/domain/runs/application/run-capabilities/capabilities/marketplace.capability';
import { McpCapability } from 'src/domain/runs/application/run-capabilities/capabilities/mcp.capability';
import { SkillsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/skills.capability';
import { RoutinesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/routines.capability';
import { ThreadSourcesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/thread-sources.capability';
import { WorkspaceInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/workspace-instructions.capability';
import { NotificationContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/notification-context.capability';
import { ClientContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/client-context.capability';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';
import { aNotification } from 'src/domain/notifications/application/testing/notification.fixtures';
import {
  aCapabilityContext,
  aThread,
  createAssembleToolUseCase,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ChatRunProfile } from './chat-run-profile';
import { RunProfileAssembler } from './run-profile-assembler.service';

const integrationId = '33333333-3333-4333-8333-333333333333' as UUID;
const notification = aNotification({
  headline: 'Neue Verordnung zur Grundsteuer',
});

function buildChatProfile(): ChatRunProfile {
  const assembleTool = createAssembleToolUseCase();
  const resolved = <T>(value: T) => ({
    execute: jest.fn().mockResolvedValue(value),
  });
  const artifactTools = new ArtifactToolAssemblerService(
    assembleTool,
    resolved([]) as never,
    resolved(null) as never,
    resolved([]) as never,
  );
  const mcpTools = new McpToolAssemblerService(
    resolved({
      tools: [
        {
          name: 'code.execution',
          description: 'Third-party code runner',
          inputSchema: { type: 'object', properties: {} },
          integrationId,
        },
      ],
      resources: [],
      prompts: [],
      returnsPii: false,
    }) as never,
    resolved([
      { id: integrationId, name: 'Stadtwerke', logoUrl: null },
    ]) as never,
  );
  return new ChatRunProfile(
    new DateTimeCapability(),
    new DataHandlingCapability(),
    new AnonymizationCapability(),
    new BehaviorCapability(),
    new LegalReferencesCapability(),
    new ClientContextCapability(assembleTool),
    new CustomInstructionsCapability(
      resolved({ systemPrompt: 'Antworten Sie stets auf Deutsch.' }) as never,
      resolved(null) as never,
    ),
    new CodeExecutionCapability(assembleTool),
    new EmailCalendarCapability(assembleTool),
    new FilesChartsMapCapability(assembleTool),
    new ArtifactsCapability(artifactTools),
    new SkillsCapability(assembleTool),
    new RoutinesCapability(assembleTool, resolved([]) as never),
    new InternetCapability(
      resolved({ internetSearchEnabled: true }) as never,
      { get: () => true } as never,
      assembleTool,
    ),
    new MarketplaceCapability({ enabled: false } as never, assembleTool),
    new ImageGenerationCapability(resolved({}) as never, assembleTool),
    new ThreadSourcesCapability(assembleTool),
    new KnowledgeBasesCapability(assembleTool),
    new NotificationContextCapability(
      resolved(notification) as never,
      { get: () => true } as never,
    ),
    new WorkspaceInstructionsCapability(),
    new McpCapability(mcpTools),
  );
}

function assembleChat(
  options: {
    canUseTools?: boolean;
    isAnonymous?: boolean;
    activatedSkillName?: string;
    thread?: Thread;
    client?: SessionClient;
  } = {},
) {
  const resolved = <T>(value: T) =>
    ({ execute: jest.fn().mockResolvedValue(value) }) as never;
  const assembler = new RunProfileAssembler(
    new RunCapabilityContextFactory(
      resolved(undefined),
      resolved([]),
      resolved([
        { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Satzungen' },
      ]),
      resolved([]),
    ),
    resolved({}),
    { toRuntimeTools: jest.fn() } as never,
    resolved([]),
  );
  return assembler.assemble(buildChatProfile(), {
    profile: { id: 'chat' },
    thread: options.thread ?? aThread({ mcpIntegrationIds: [integrationId] }),
    model: aCapabilityContext({ canUseTools: options.canUseTools ?? true })
      .model,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    isAnonymous: options.isAnonymous ?? false,
    client: options.client ?? null,
    activatedSkillName: options.activatedSkillName,
  });
}

describe('ChatRunProfile', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-06T10:23:45.000Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('ends a run when the model stops calling tools', () => {
    expect(buildChatProfile().completionPolicy.decide({ nudges: 0 })).toEqual({
      status: 'done',
    });
  });

  it('offers the chat tools with MCP integrations last', async () => {
    const { tools } = await assembleChat();
    const names = tools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        ToolType.CODE_EXECUTION,
        ToolType.SEND_EMAIL,
        ToolType.CREATE_FILE,
        ToolType.MAP,
        ToolType.CREATE_DOCUMENT,
        ToolType.CREATE_SKILL,
        ToolType.CREATE_ROUTINE,
        ToolType.WEBSITE_CONTENT,
        ToolType.INTERNET_SEARCH,
        ToolType.GENERATE_IMAGE,
        ToolType.KNOWLEDGE_QUERY,
      ]),
    );
    expect(names.at(-1)).toBe(
      `mcp__tool__code.execution__${integrationId.slice(0, 8)}`,
    );
    expect(names.filter((name) => name === 'code_execution')).toHaveLength(1);
  });

  it('gives a chat about a notification its content after the stable prompt prefix, without routine tools', async () => {
    const { tools, instructions } = await assembleChat({
      thread: aThread({ sourceNotificationId: notification.id }),
    });

    expect(instructions).toMatch(
      /^You are an AI assistant powered by Ayunis Core[\s\S]*<\/behavior_instructions>[\s\S]*<notification_under_discussion>[\s\S]*<headline>Neue Verordnung zur Grundsteuer<\/headline>[\s\S]*You are now ready to assist the user\.$/,
    );
    expect(tools.map((tool) => tool.name)).not.toContain(
      ToolType.SEND_NOTIFICATION,
    );
  });

  it('adds no notification to an ordinary chat', async () => {
    const { instructions } = await assembleChat();

    expect(instructions).not.toContain('<notification_under_discussion>');
  });

  it('starts the prompt with the date-only preamble so the cached prefix stays stable', async () => {
    const { instructions } = await assembleChat();

    expect(instructions).toMatch(
      /^You are an AI assistant powered by Ayunis Core[\s\S]*?<\/application_details>\n\n<context>\nCurrent date: 2026-11-06\n<\/context>\n\n<behavior_instructions>/,
    );
    expect(instructions).not.toContain('10:23');
  });

  it('ends with the custom instructions and the closing line', async () => {
    const { instructions } = await assembleChat();

    expect(instructions).toMatch(
      /<organization_instructions>[\s\S]*Antworten Sie stets auf Deutsch\.[\s\S]*<\/organization_instructions>\n\nYou are now ready to assist the user\.$/,
    );
  });

  it('appends the quick-action skill note after the closing line', async () => {
    const { instructions } = await assembleChat({
      activatedSkillName: 'Bauantrag prüfen',
    });

    expect(instructions).toMatch(
      /You are now ready to assist the user\.\n\n<already_activated_skill>\nSkill "Bauantrag prüfen" has already been activated/,
    );
  });

  it('keeps guidance, policies and thread files but offers no tools when the model cannot use tools', async () => {
    const thread = aThread({
      sourceAssignments: [
        new SourceAssignment({
          source: new FileSource({
            fileType: FileType.PDF,
            name: 'Haushaltsplan.pdf',
            type: TextType.FILE,
            status: SourceStatus.READY,
          }),
        }),
      ],
    });

    const { tools, instructions } = await assembleChat({
      canUseTools: false,
      thread,
    });

    expect(tools).toEqual([]);
    for (const section of [
      '<tool_guidelines>',
      '<file_usage>',
      '<document_usage>',
      '<available_files>',
      '<data_handling>',
      '<response_guidelines>',
      '<legal_references>',
      '<platform_information>',
    ]) {
      expect(instructions).toContain(section);
    }
    expect(instructions).not.toContain('<available_knowledge_bases>');
  });

  it('adds the Outlook tools and context to an Outlook session after the platform information and before the custom instructions', async () => {
    const outlook = await assembleChat({ client: 'outlook' });

    expect(outlook.instructions).toMatch(
      /<\/platform_information>[\s\S]*<outlook_context>[\s\S]*<\/outlook_context>[\s\S]*<organization_instructions>/,
    );
    expect(outlook.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        ToolType.OUTLOOK_READ_EMAIL,
        ToolType.OUTLOOK_READ_ATTACHMENT,
        ToolType.OUTLOOK_DRAFT_EMAIL,
        ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER,
        ToolType.OUTLOOK_SAVE_EMAIL_TO_DRAFT,
      ]),
    );
  });

  it('leaves the web chat prompt and tools exactly as an Outlook session has them without its additions', async () => {
    const web = await assembleChat();
    const outlook = await assembleChat({ client: 'outlook' });

    expect(web.instructions).not.toContain('outlook__');
    expect(
      outlook.instructions.replace(
        /\n\n<outlook_context>[\s\S]*<\/outlook_context>/,
        '',
      ),
    ).toBe(web.instructions);
    expect(
      outlook.tools
        .map((tool) => tool.name)
        .filter((name) => !name.startsWith('outlook__')),
    ).toEqual(web.tools.map((tool) => tool.name));
    expect(web.tools.map((tool) => tool.name)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^outlook__/)]),
    );
  });

  it('adds the anonymization rules only to anonymous runs', async () => {
    const anonymous = await assembleChat({ isAnonymous: true });
    const regular = await assembleChat();

    expect(anonymous.instructions).toContain('<anonymized_data>');
    expect(regular.instructions).not.toContain('<anonymized_data>');
  });
});
