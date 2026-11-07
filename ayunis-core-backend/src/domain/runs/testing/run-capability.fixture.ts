import type { UUID } from 'crypto';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ToolFactory } from 'src/domain/tools/application/tool.factory';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type {
  RunCapabilityContext,
  SkillCatalog,
} from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  PromptSlot,
} from 'src/domain/runs/application/run-capabilities/run-capability';

export const TEST_ORG_ID = '11111111-1111-4111-8111-111111111111' as UUID;
export const TEST_USER_ID = '22222222-2222-4222-8222-222222222222' as UUID;

export function aThread(
  overrides: Partial<ConstructorParameters<typeof Thread>[0]> = {},
): Thread {
  return new Thread({
    userId: TEST_USER_ID,
    messages: [],
    mcpIntegrationIds: [],
    sourceAssignments: [],
    ...overrides,
  });
}

export function aCapabilityContext(
  overrides: Partial<Omit<RunCapabilityContext, 'model'>> & {
    canUseTools?: boolean;
    knowledgeBases?: RunCapabilityContext['knowledgeBases'];
    skillCatalog?: RunCapabilityContext['skillCatalog'];
  } = {},
): RunCapabilityContext {
  const { canUseTools = true, ...rest } = overrides;
  return {
    thread: aThread(),
    model: { name: 'mistral-large', canUseTools } as LanguageModel,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    isAnonymous: false,
    now: new Date('2026-11-06T10:23:45.000Z'),
    threadSources: [],
    knowledgeBases: () => Promise.resolve([]),
    skillCatalog: () => Promise.resolve(anEmptySkillCatalog()),
    ...rest,
  };
}

export function anEmptySkillCatalog(): SkillCatalog {
  return { slugMap: new Map(), editableSkillIds: new Map(), entries: [] };
}

/** Assembles the real tool entities, as the tools module does at run time. */
export function createAssembleToolUseCase(): AssembleToolUseCase {
  return new AssembleToolUseCase(
    new ToolFactory(),
    {} as never,
    {
      get: () => TEST_USER_ID,
    } as never,
  );
}

export function toolNames(contribution: CapabilityContribution): string[] {
  return (contribution.tools ?? []).map((tool: Tool) => tool.name);
}

export function sectionsIn(
  contribution: CapabilityContribution,
  slot: PromptSlot,
): string[] {
  return (contribution.sections ?? [])
    .filter((section) => section.slot === slot)
    .map((section) => section.content);
}

export function promptText(contribution: CapabilityContribution): string {
  return (contribution.sections ?? [])
    .map((section) => section.content)
    .join('\n\n');
}
