import type { UUID } from 'crypto';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { McpToolAssemblerService } from 'src/domain/runs/application/services/mcp-tool-assembler.service';
import { RunCapabilityContextFactory } from 'src/domain/runs/application/run-capabilities/run-capability-context.factory';
import { AnonymizationCapability } from 'src/domain/runs/application/run-capabilities/capabilities/anonymization.capability';
import { BehaviorCapability } from 'src/domain/runs/application/run-capabilities/capabilities/behavior.capability';
import { CustomInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/custom-instructions.capability';
import { DataHandlingCapability } from 'src/domain/runs/application/run-capabilities/capabilities/data-handling.capability';
import { DateTimeCapability } from 'src/domain/runs/application/run-capabilities/capabilities/date-time.capability';
import { InternetCapability } from 'src/domain/runs/application/run-capabilities/capabilities/internet.capability';
import { KnowledgeBasesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/knowledge-bases.capability';
import { LegalReferencesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/legal-references.capability';
import { McpCapability } from 'src/domain/runs/application/run-capabilities/capabilities/mcp.capability';
import { NotificationContextCapability } from 'src/domain/runs/application/run-capabilities/capabilities/notification-context.capability';
import { OutlookAddInCapability } from 'src/domain/runs/application/run-capabilities/capabilities/outlook-add-in.capability';
import { ThreadSourcesCapability } from 'src/domain/runs/application/run-capabilities/capabilities/thread-sources.capability';
import { WorkspaceInstructionsCapability } from 'src/domain/runs/application/run-capabilities/capabilities/workspace-instructions.capability';
import {
  aCapabilityContext,
  aThread,
  createAssembleToolUseCase,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/runs/testing/run-capability.fixture';
import { OutlookRunProfile } from './outlook-run-profile';
import { RunProfileAssembler } from './run-profile-assembler.service';

const integrationId = '33333333-3333-4333-8333-333333333333' as UUID;

/** Tools the pane has no renderer for; a run there must not offer them. */
const WEB_ONLY_TOOLS = [
  ToolType.CODE_EXECUTION,
  ToolType.SEND_EMAIL,
  ToolType.CREATE_CALENDAR_EVENT,
  ToolType.CREATE_FILE,
  ToolType.MAP,
  ToolType.BAR_CHART,
  ToolType.LINE_CHART,
  ToolType.PIE_CHART,
  ToolType.GENERATE_IMAGE,
  ToolType.CREATE_SKILL,
  ToolType.EDIT_SKILL,
  ToolType.ACTIVATE_SKILL,
  ToolType.CREATE_ROUTINE,
  ToolType.EDIT_ROUTINE,
  ToolType.MARKETPLACE_SEARCH,
  ToolType.INSTALL_MARKETPLACE_SKILL,
];

function buildOutlookProfile(): OutlookRunProfile {
  const assembleTool = createAssembleToolUseCase();
  const resolved = <T>(value: T) => ({
    execute: jest.fn().mockResolvedValue(value),
  });
  const mcpTools = new McpToolAssemblerService(
    resolved({
      tools: [
        {
          name: 'ratsinfo.search',
          description: 'Council information system',
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
  return new OutlookRunProfile(
    new DateTimeCapability(),
    new DataHandlingCapability(),
    new AnonymizationCapability(),
    new BehaviorCapability(),
    new LegalReferencesCapability(),
    new OutlookAddInCapability(assembleTool),
    new CustomInstructionsCapability(
      resolved({ systemPrompt: 'Antworten Sie stets auf Deutsch.' }) as never,
      resolved(null) as never,
    ),
    new InternetCapability(
      resolved({ internetSearchEnabled: true }) as never,
      { get: () => true } as never,
      assembleTool,
    ),
    new ThreadSourcesCapability(assembleTool),
    new KnowledgeBasesCapability(assembleTool),
    new NotificationContextCapability(
      resolved(null) as never,
      { get: () => true } as never,
    ),
    new WorkspaceInstructionsCapability(),
    new McpCapability(mcpTools),
  );
}

function assembleOutlook() {
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
  return assembler.assemble(buildOutlookProfile(), {
    profile: { id: 'outlook' },
    thread: aThread({
      mcpIntegrationIds: [integrationId],
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
    }),
    model: aCapabilityContext().model,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    isAnonymous: false,
  });
}

describe('OutlookRunProfile', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-06T10:23:45.000Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('offers the five Outlook tools', async () => {
    const { tools } = await assembleOutlook();

    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        ToolType.OUTLOOK_READ_EMAIL,
        ToolType.OUTLOOK_READ_ATTACHMENT,
        ToolType.OUTLOOK_DRAFT_EMAIL,
        ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER,
        ToolType.OUTLOOK_SAVE_EMAIL_TO_DRAFT,
      ]),
    );
  });

  it('offers no tool whose result the pane cannot render', async () => {
    const { tools } = await assembleOutlook();
    const names = tools.map((tool) => tool.name);

    expect(names).toEqual(expect.not.arrayContaining(WEB_ONLY_TOOLS));
  });

  it('keeps the retrieval tools the pane answers from', async () => {
    const { tools } = await assembleOutlook();
    const names = tools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        ToolType.SOURCE_QUERY,
        ToolType.KNOWLEDGE_QUERY,
        ToolType.INTERNET_SEARCH,
      ]),
    );
    expect(names.at(-1)).toBe(
      `mcp__tool__ratsinfo.search__${integrationId.slice(0, 8)}`,
    );
  });

  it('places the Outlook context after the platform information and before the custom instructions', async () => {
    const { instructions } = await assembleOutlook();

    expect(instructions).toMatch(
      /<\/platform_information>[\s\S]*<outlook_context>[\s\S]*<\/outlook_context>[\s\S]*<organization_instructions>/,
    );
  });

  it('ends a run when the model stops calling tools', () => {
    expect(
      buildOutlookProfile().completionPolicy.decide({ nudges: 0 }),
    ).toEqual({ status: 'done' });
  });
});
