import type {
  AfterToolCallContext,
  Hook,
  RunContext,
  Tool,
  ToolExecutionResult,
} from '@ayunis/agent-runtime';

import type { RuntimeExtension } from '../extensions/runtime-extension';
import { buildAvailableSkills } from './available-skills';
import type { SkillDefinition, SkillSource } from './skill-source';

const ACTIVATE_SKILL = 'activate_skill';
const RUN_STATE = Symbol('skills-extension-run-state');

export interface SkillsExtensionConfig {
  readonly source: SkillSource;
}

interface PendingActivation {
  readonly name: string;
  readonly definition: SkillDefinition;
  readonly toolNames: readonly string[];
}

interface SkillsRunState {
  readonly activatedNames: Set<string>;
  readonly pendingToolNames: Set<string>;
  readonly pendingByCall: Map<string, PendingActivation>;
  readonly pendingNames: Set<string>;
}

export const skillsExtension: RuntimeExtension<SkillsExtensionConfig> = async ({
  source,
}) => {
  const available = buildAvailableSkills(await source.list());
  if (available.names.length === 0) {
    return { name: 'skills' };
  }
  const knownNames = new Set(available.names);
  const activationTool = createActivationTool(source, knownNames);

  return {
    name: 'skills',
    tools: [activationTool],
    instructions: available.instructions,
    hooks: [createSkillsHook()],
  };
};

const createActivationTool = (
  source: SkillSource,
  knownNames: ReadonlySet<string>,
): Tool => ({
  name: ACTIVATE_SKILL,
  description:
    'Load one available skill and make its instructions and tools available.',
  parameters: buildActivationSchema(knownNames),
  validateInput: (input) => {
    parseSkillName(input, knownNames);
  },
  execute: async (input, { context, signal, toolCallId, toolNames }) => {
    const name = parseSkillName(input, knownNames);
    const state = getRunState(context);
    if (!state) {
      return activationError(name, 'skill run state is unavailable');
    }
    if (state.activatedNames.has(name) || state.pendingNames.has(name)) {
      return activationSuccess(`Skill "${name}" is already active.`);
    }
    return loadActivation({
      source,
      state,
      name,
      toolCallId,
      currentToolNames: toolNames,
      signal,
    });
  },
});

const buildActivationSchema = (knownNames: ReadonlySet<string>) => ({
  type: 'object',
  properties: {
    name: {
      type: 'string',
      enum: [...knownNames],
      description: 'The name of the skill to activate.',
    },
  },
  required: ['name'],
  additionalProperties: false,
});

const parseSkillName = (
  input: Record<string, unknown>,
  knownNames: ReadonlySet<string>,
): string => {
  if (
    typeof input.name !== 'string' ||
    input.name.length === 0 ||
    Object.keys(input).some((key) => key !== 'name')
  ) {
    throw new Error('activate_skill requires exactly one valid skill name');
  }
  if (!knownNames.has(input.name)) {
    throw new Error(`Unknown skill: ${input.name}`);
  }
  return input.name;
};

interface LoadActivationParams {
  readonly source: SkillSource;
  readonly state: SkillsRunState;
  readonly name: string;
  readonly toolCallId: string;
  readonly currentToolNames: readonly string[];
  readonly signal?: AbortSignal;
}

const loadActivation = async ({
  source,
  state,
  name,
  toolCallId,
  currentToolNames,
  signal,
}: LoadActivationParams): Promise<ToolExecutionResult> => {
  try {
    signal?.throwIfAborted();
    const definition = await source.load(name, { signal });
    signal?.throwIfAborted();
    validateDefinition(definition, name);
    const toolNames = claimToolNames(
      state,
      definition.tools ?? [],
      currentToolNames,
    );
    state.pendingNames.add(name);
    state.pendingByCall.set(toolCallId, { name, definition, toolNames });
    return activationSuccess(`Activated skill "${name}".`);
  } catch (error) {
    return activationError(name, errorMessage(error));
  }
};

const validateDefinition = (
  definition: SkillDefinition,
  requestedName: string,
): void => {
  if (definition.name !== requestedName) {
    throw new Error(
      'loaded definition name does not match the requested skill',
    );
  }
  if (!definition.description || !definition.instructions) {
    throw new Error(
      'loaded definition requires a description and instructions',
    );
  }
  if (definition.tools !== undefined && !Array.isArray(definition.tools)) {
    throw new TypeError('loaded definition tools must be an array');
  }
};

const claimToolNames = (
  state: SkillsRunState,
  tools: readonly Tool[],
  currentToolNames: readonly string[],
): string[] => {
  const claimed = new Set([...currentToolNames, ...state.pendingToolNames]);
  const toolNames: string[] = [];
  for (const skillTool of tools) {
    if (!skillTool.name || claimed.has(skillTool.name)) {
      throw new Error(`tool name conflicts: ${skillTool.name}`);
    }
    claimed.add(skillTool.name);
    toolNames.push(skillTool.name);
  }
  for (const name of toolNames) {
    state.pendingToolNames.add(name);
  }
  return toolNames;
};

const createSkillsHook = (): Hook => ({
  name: 'skills-activation',
  runStart: ({ context }) => {
    context.set<SkillsRunState>(RUN_STATE, {
      activatedNames: new Set(),
      pendingToolNames: new Set(),
      pendingByCall: new Map(),
      pendingNames: new Set(),
    });
  },
  beforeModelCall: ({ context }) => {
    getRunState(context)?.pendingToolNames.clear();
  },
  afterToolCall: (context) => {
    applyPendingActivation(context);
  },
});

const applyPendingActivation = (context: AfterToolCallContext): void => {
  if (context.toolCall.name !== ACTIVATE_SKILL) {
    return;
  }
  const state = getRunState(context.context);
  const pending = state?.pendingByCall.get(context.toolCall.id);
  if (!state || !pending) {
    return;
  }
  state.pendingByCall.delete(context.toolCall.id);
  state.pendingNames.delete(pending.name);
  if (context.isError) {
    releaseToolNames(state, pending.toolNames);
    return;
  }
  state.activatedNames.add(pending.name);
  context.addInstructions(pending.definition.instructions);
  context.addTools(...(pending.definition.tools ?? []));
};

const releaseToolNames = (
  state: SkillsRunState,
  toolNames: readonly string[],
): void => {
  for (const name of toolNames) {
    state.pendingToolNames.delete(name);
  }
};

const getRunState = (context: RunContext): SkillsRunState | undefined =>
  context.get<SkillsRunState>(RUN_STATE);

const activationSuccess = (result: string): ToolExecutionResult => ({
  result,
  isError: false,
});

const activationError = (
  name: string,
  reason: string,
): ToolExecutionResult => ({
  result: `Could not activate skill "${name}": ${reason}`,
  isError: true,
});

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
