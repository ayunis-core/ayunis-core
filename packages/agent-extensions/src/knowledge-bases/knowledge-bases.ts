import type { AfterToolCallContext, Hook } from '@ayunis/agent-runtime';

import type { ExtensionState } from '../extensions/context';
import { defineExtension } from '../extensions/extension';
import { buildKnowledgeInstructions } from './knowledge-instructions';
import {
  createKnowledgeTools,
  type KnowledgeGetTextPort,
  type KnowledgeQueryPort,
} from './knowledge-tools';

export interface KnowledgeBaseSummary {
  readonly id: string;
  readonly name: string;
}

export interface KnowledgeBaseState {
  readonly knowledgeBases: ReadonlyMap<string, KnowledgeBaseSummary>;
}

export interface KnowledgeBaseUsageEvent {
  readonly event: AfterToolCallContext;
  readonly activeKnowledgeBases: readonly KnowledgeBaseSummary[];
}

export interface KnowledgeBaseConfig {
  resolveAuthorized(
    ids: readonly string[],
  ): Promise<readonly KnowledgeBaseSummary[]>;
  query: KnowledgeQueryPort;
  getText: KnowledgeGetTextPort;
  recordUsage?(event: KnowledgeBaseUsageEvent): void | Promise<void>;
}

export interface KnowledgeBaseApi {
  add(ids: readonly string[]): Promise<void>;
  remove(ids: readonly string[]): void;
}

const usageHook = Symbol('knowledge-base-usage-hook');
interface RuntimeKnowledgeBaseApi extends KnowledgeBaseApi {
  readonly [usageHook]: Hook;
}

export const KnowledgeBases = defineExtension<
  'knowledge-bases',
  KnowledgeBaseState,
  KnowledgeBaseApi,
  KnowledgeBaseConfig
>({
  name: 'knowledge-bases',
  setup(context, config) {
    const state = context.state<KnowledgeBaseState>({
      knowledgeBases: new Map(),
    });
    const api = createApi(state, config);
    return { state, api };
  },
  contribute({ state, api }, config) {
    const active = sortedSummaries(state.knowledgeBases.values());
    const hook = (api as RuntimeKnowledgeBaseApi)[usageHook];
    if (active.length === 0) {
      return { hooks: [hook] };
    }
    const ids = active.map(({ id }) => id);
    return {
      instructions: buildKnowledgeInstructions(active),
      tools: createKnowledgeTools({
        knowledgeBaseIds: ids,
        query: config.query,
        getText: config.getText,
      }),
      hooks: [hook],
    };
  },
});

const createApi = (
  state: ExtensionState<KnowledgeBaseState>,
  config: Readonly<KnowledgeBaseConfig>,
): RuntimeKnowledgeBaseApi => {
  const api: RuntimeKnowledgeBaseApi = {
    add: (ids) => addKnowledgeBases(state, config, ids),
    remove: (ids) => removeKnowledgeBases(state, ids),
    [usageHook]: createUsageHook(state, config),
  };
  return api;
};

const addKnowledgeBases = async (
  state: ExtensionState<KnowledgeBaseState>,
  config: Readonly<KnowledgeBaseConfig>,
  requestedIds: readonly string[],
): Promise<void> => {
  assertUniqueRequestedIds(requestedIds);
  const missingIds = requestedIds.filter(
    (id) => !state.current.knowledgeBases.has(id),
  );
  if (missingIds.length === 0) {
    return;
  }
  const resolved = await config.resolveAuthorized([...missingIds]);
  validateResolved(missingIds, resolved);
  state.update((current) => ({
    knowledgeBases: mergeKnowledgeBases(current.knowledgeBases, resolved),
  }));
};

const removeKnowledgeBases = (
  state: ExtensionState<KnowledgeBaseState>,
  ids: readonly string[],
): void => {
  const removed = new Set(ids);
  const remaining = [...state.current.knowledgeBases.values()].filter(
    ({ id }) => !removed.has(id),
  );
  if (remaining.length === state.current.knowledgeBases.size) {
    return;
  }
  state.update(() => ({ knowledgeBases: toSortedMap(remaining) }));
};

const validateResolved = (
  requestedIds: readonly string[],
  resolved: readonly KnowledgeBaseSummary[],
): void => {
  const requested = new Set(requestedIds);
  const resolvedIds = new Set<string>();
  for (const summary of resolved) {
    validateSummary(summary);
    if (resolvedIds.has(summary.id)) {
      throw new Error(`Duplicate resolved knowledge base '${summary.id}'.`);
    }
    if (!requested.has(summary.id)) {
      throw new Error(
        `Unrequested knowledge base '${summary.id}' was resolved.`,
      );
    }
    resolvedIds.add(summary.id);
  }
  const missing = requestedIds.find((id) => !resolvedIds.has(id));
  if (missing) {
    throw new Error(`Missing authorized knowledge base '${missing}'.`);
  }
};

const validateSummary = (summary: KnowledgeBaseSummary): void => {
  if (!summary.id || !summary.name) {
    throw new Error('Resolved knowledge bases require non-empty id and name.');
  }
};

const assertUniqueRequestedIds = (ids: readonly string[]): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id) {
      throw new Error('Knowledge base IDs must not be empty.');
    }
    if (seen.has(id)) {
      throw new Error(`Duplicate requested knowledge base '${id}'.`);
    }
    seen.add(id);
  }
};

const mergeKnowledgeBases = (
  current: ReadonlyMap<string, KnowledgeBaseSummary>,
  additions: readonly KnowledgeBaseSummary[],
): ReadonlyMap<string, KnowledgeBaseSummary> =>
  toSortedMap([...current.values(), ...additions]);

const toSortedMap = (
  summaries: readonly KnowledgeBaseSummary[],
): ReadonlyMap<string, KnowledgeBaseSummary> =>
  new Map(sortedSummaries(summaries).map((summary) => [summary.id, summary]));

const sortedSummaries = (
  summaries: Iterable<KnowledgeBaseSummary>,
): KnowledgeBaseSummary[] =>
  [...summaries].sort((left, right) => left.id.localeCompare(right.id));

const createUsageHook = (
  state: ExtensionState<KnowledgeBaseState>,
  config: Readonly<KnowledgeBaseConfig>,
): Hook => ({
  name: 'knowledge-base-usage',
  afterToolCall: (event) => {
    if (!isKnowledgeTool(event.toolCall.name) || !config.recordUsage) {
      return;
    }
    return config.recordUsage({
      event,
      activeKnowledgeBases: sortedSummaries(
        state.current.knowledgeBases.values(),
      ),
    });
  },
});

const isKnowledgeTool = (name: string): boolean =>
  name === 'knowledge_query' || name === 'knowledge_get_text';
