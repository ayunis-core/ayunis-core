import type { Hook, Tool, ToolExecutionResult } from '@ayunis/agent-runtime';

import type { ExtensionContext, ExtensionState } from '../extensions/context';
import {
  defineExtension,
  type ConfiguredExtension,
  type ExtensionDefinition,
} from '../extensions/extension';
import { buildAvailableSkills, type AvailableSkills } from './available-skills';
import {
  defineSkill,
  type SkillDefinition,
  type SkillDefinitionSpec,
  type SkillSummary,
} from './skill-definition';
import type { SkillSource } from './skill-source';

const ACTIVATE_SKILL = 'activate_skill';
const activationTool = Symbol('skills-activation-tool');
const catalogInstructions = Symbol('skills-catalog-instructions');
const completionHook = Symbol('skills-completion-hook');

export interface PendingSkillActivation {
  readonly name: string;
  readonly definition: SkillDefinition;
}

export interface SkillsState {
  readonly pendingByCall: ReadonlyMap<string, PendingSkillActivation>;
  readonly activated: ReadonlyMap<string, SkillDefinition>;
}

export interface SkillsConfig {
  readonly source: SkillSource;
}

export type SkillsApi = object;

interface RuntimeSkillsApi {
  readonly [activationTool]: Tool;
  readonly [catalogInstructions]: string;
  readonly [completionHook]: Hook;
}

type BaseSkillsDefinition = ExtensionDefinition<
  'skills',
  SkillsConfig,
  SkillsState,
  SkillsApi
>;

export type SkillsDefinition = Omit<BaseSkillsDefinition, 'configure'> & {
  define(spec: SkillDefinitionSpec): SkillDefinition;
  configure(
    config: SkillsConfig,
  ): ConfiguredExtension<SkillsDefinition, SkillsConfig>;
};

const BaseSkills = defineExtension<
  'skills',
  SkillsState,
  SkillsApi,
  SkillsConfig
>({
  name: 'skills',
  async setup(context, config) {
    const available = buildAvailableSkills(await config.source.list());
    const state = context.state<SkillsState>({
      pendingByCall: new Map(),
      activated: new Map(),
    });
    const api = createRuntimeApi(context, state, config.source, available);
    return { state, api };
  },
  contribute({ state, api }) {
    const runtimeApi = api as RuntimeSkillsApi;
    if (!runtimeApi[catalogInstructions]) {
      return {};
    }
    const definitions = capabilityDefinitions(state);
    return {
      instructions: buildInstructions(
        runtimeApi[catalogInstructions],
        definitions,
      ),
      tools: [
        runtimeApi[activationTool],
        ...definitions.flatMap(({ tools }) => [...(tools ?? [])]),
      ],
      hooks: [runtimeApi[completionHook]],
    };
  },
});

export const Skills: SkillsDefinition = Object.freeze({
  ...BaseSkills,
  define: defineSkill,
  configure(config: SkillsConfig) {
    const configured = BaseSkills.configure(config);
    return Object.freeze({ definition: Skills, config: configured.config });
  },
});

const createRuntimeApi = (
  context: ExtensionContext,
  state: ExtensionState<SkillsState>,
  source: SkillSource,
  available: AvailableSkills,
): RuntimeSkillsApi => ({
  [activationTool]: createActivationTool(context, state, source, available),
  [catalogInstructions]: available.instructions,
  [completionHook]: createCompletionHook(state),
});

const createActivationTool = (
  context: ExtensionContext,
  state: ExtensionState<SkillsState>,
  source: SkillSource,
  available: AvailableSkills,
): Tool => ({
  name: ACTIVATE_SKILL,
  description: 'Activate one available skill for the current agent run.',
  parameters: available.activationSchema,
  validateInput: (input) => parseSkillName(input, available.names),
  execute: async (input, toolContext) => {
    const name = parseSkillName(input, available.names);
    if (isAlreadyPrepared(state.current, name)) {
      return activationSuccess(`Skill "${name}" is already active.`);
    }
    return prepareActivation({
      context,
      state,
      source,
      expected: available.summaries.get(name),
      name,
      toolCallId: toolContext.toolCallId,
    });
  },
});

interface ActivationPreparation {
  readonly context: ExtensionContext;
  readonly state: ExtensionState<SkillsState>;
  readonly source: SkillSource;
  readonly expected?: SkillSummary;
  readonly name: string;
  readonly toolCallId: string;
}

const prepareActivation = async (
  preparation: ActivationPreparation,
): Promise<ToolExecutionResult> => {
  try {
    const loaded = await preparation.source.load(preparation.name);
    validateLoadedMetadata(loaded, preparation.expected, preparation.name);
    const definition = defineSkill(loaded);
    await definition.activate?.(preparation.context);
    stagePending(preparation.state, preparation.toolCallId, definition);
    return activationSuccess(
      `Prepared skill "${preparation.name}" for activation.`,
    );
  } catch (error) {
    throw new SkillActivationError(preparation.name, error);
  }
};

const stagePending = (
  state: ExtensionState<SkillsState>,
  toolCallId: string,
  definition: SkillDefinition,
): void => {
  state.update((current) => {
    if (current.pendingByCall.has(toolCallId)) {
      throw new Error(`Tool call '${toolCallId}' already prepared a skill.`);
    }
    const pendingByCall = new Map(current.pendingByCall);
    pendingByCall.set(toolCallId, { name: definition.name, definition });
    return { ...current, pendingByCall };
  });
};

const createCompletionHook = (state: ExtensionState<SkillsState>): Hook => ({
  name: 'skills-activation-completion',
  afterToolCall: (event) => {
    if (event.toolCall.name !== ACTIVATE_SKILL) {
      return;
    }
    const pending = state.current.pendingByCall.get(event.toolCall.id);
    if (!pending) {
      return;
    }
    state.update((current) =>
      completePending(current, event.toolCall.id, event.outcome),
    );
  },
});

const completePending = (
  current: Readonly<SkillsState>,
  toolCallId: string,
  outcome: 'success' | 'error' | 'aborted',
): SkillsState => {
  const pending = current.pendingByCall.get(toolCallId);
  const pendingByCall = new Map(current.pendingByCall);
  pendingByCall.delete(toolCallId);
  if (!pending || outcome !== 'success') {
    return { ...current, pendingByCall };
  }
  const activated = new Map(current.activated);
  activated.set(pending.name, pending.definition);
  return { pendingByCall, activated };
};

const capabilityDefinitions = (
  state: Readonly<SkillsState>,
): SkillDefinition[] => {
  const definitions = new Map(state.activated);
  for (const pending of state.pendingByCall.values()) {
    definitions.set(pending.name, pending.definition);
  }
  return [...definitions.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};

const buildInstructions = (
  catalog: string,
  definitions: readonly SkillDefinition[],
): string =>
  [catalog, ...definitions.map(({ instructions }) => instructions)]
    .filter(Boolean)
    .join('\n\n');

const validateLoadedMetadata = (
  definition: SkillDefinition,
  expected: SkillSummary | undefined,
  requestedName: string,
): void => {
  if (
    !expected ||
    definition.name !== requestedName ||
    definition.description !== expected.description
  ) {
    throw new Error(
      'Loaded skill identity or metadata does not match its catalog entry.',
    );
  }
};

const parseSkillName = (
  input: Record<string, unknown>,
  availableNames: readonly string[],
): string => {
  if (
    Object.keys(input).length !== 1 ||
    typeof input.name !== 'string' ||
    !availableNames.includes(input.name)
  ) {
    throw new Error(
      'activate_skill requires exactly one available skill name.',
    );
  }
  return input.name;
};

const isAlreadyPrepared = (
  state: Readonly<SkillsState>,
  name: string,
): boolean =>
  state.activated.has(name) ||
  [...state.pendingByCall.values()].some((pending) => pending.name === name);

const activationSuccess = (result: string): ToolExecutionResult => ({
  result,
  isError: false,
});

class SkillActivationError extends Error {
  constructor(
    readonly skillName: string,
    cause: unknown,
  ) {
    super(`Could not activate skill "${skillName}": ${errorMessage(cause)}`, {
      cause,
    });
    this.name = 'SkillActivationError';
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
