import type { ExtensionContribution } from '@ayunis/agent-extensions';
import type { Hook, Tool } from '@ayunis/agent-runtime';

interface OwnedContribution {
  readonly ownerName: string;
  readonly instructions?: string;
  readonly tools: readonly Tool[];
  readonly hooks: readonly Hook[];
}

export interface ContributionPlan {
  readonly entries: ReadonlyMap<string, OwnedContribution>;
}

export interface ToolMerge {
  readonly hostTools: readonly Tool[];
  readonly tools: readonly Tool[];
}

export class ContributionStore {
  private entries = new Map<string, OwnedContribution>();
  private hostInstructions = '';
  private extensionInstructions = '';
  private hostTools: readonly Tool[] = [];
  private mergedInstructions = '';
  private initialized = false;

  initialize(
    host: { instructions: string; tools: readonly Tool[] },
    projected: ReadonlyMap<string, ExtensionContribution>,
  ): { instructions: string; tools: Tool[]; hooks: Hook[] } {
    if (this.initialized) {
      throw new Error('Extension contributions have already been composed.');
    }
    const plan = this.createPlan(projected);
    const tools = mergeTools(host.tools, plan.entries);
    const instructions = mergeInstructions(host.instructions, plan.entries);
    this.entries = new Map(plan.entries);
    this.hostInstructions = host.instructions;
    this.extensionInstructions = instructionsFrom(plan.entries);
    this.hostTools = [...host.tools];
    this.mergedInstructions = instructions;
    this.initialized = true;
    return { instructions, tools, hooks: hooksFrom(plan.entries) };
  }

  createPlan(
    projected: ReadonlyMap<string, ExtensionContribution>,
  ): ContributionPlan {
    const entries = new Map(this.entries);
    for (const [ownerName, contribution] of projected) {
      const next = normalize(ownerName, contribution);
      assertStableHooks(entries.get(ownerName), next);
      entries.set(ownerName, next);
    }
    return { entries };
  }

  validate(plan: ContributionPlan): void {
    mergeTools(this.hostTools, plan.entries);
  }

  synchronizeTools(prospective: readonly Tool[]): void {
    const plan = this.createPlan(new Map());
    this.hostTools = [...this.mergeTools(plan, prospective).hostTools];
  }

  mergeTools(plan: ContributionPlan, prospective: readonly Tool[]): ToolMerge {
    this.assertInitialized();
    const previousTools = toolsFrom(this.entries);
    const previousOwned = new Set(previousTools);
    const nextNames = new Set(
      toolsFrom(plan.entries).map((candidate) => candidate.name),
    );
    const retainedNames = new Set(
      previousTools
        .map((candidate) => candidate.name)
        .filter((name) => nextNames.has(name)),
    );
    const hostTools = prospective.filter(
      (candidate) =>
        !previousOwned.has(candidate) && !retainedNames.has(candidate.name),
    );
    return {
      hostTools,
      tools: mergeTools(hostTools, plan.entries),
    };
  }

  mergeInstructions(plan: ContributionPlan, prospective: string): string {
    this.assertInitialized();
    const hostInstructions = this.extractHostInstructions(prospective);
    return mergeInstructions(hostInstructions, plan.entries);
  }

  commit(
    plan: ContributionPlan,
    tools: ToolMerge,
    prospectiveInstructions: string,
    mergedInstructions: string,
  ): void {
    this.entries = new Map(plan.entries);
    this.hostTools = [...tools.hostTools];
    this.hostInstructions = this.extractHostInstructions(
      prospectiveInstructions,
    );
    this.extensionInstructions = instructionsFrom(plan.entries);
    this.mergedInstructions = mergedInstructions;
  }

  private extractHostInstructions(prospective: string): string {
    if (prospective === this.mergedInstructions) {
      return this.hostInstructions;
    }
    const prefix = `${this.mergedInstructions}\n\n`;
    if (this.mergedInstructions && prospective.startsWith(prefix)) {
      return append(this.hostInstructions, prospective.slice(prefix.length));
    }
    const extensionSuffix = `\n\n${this.extensionInstructions}`;
    if (this.extensionInstructions && prospective.endsWith(extensionSuffix)) {
      return prospective.slice(0, -extensionSuffix.length);
    }
    return prospective;
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error('Extension contributions must be composed first.');
    }
  }
}

const normalize = (
  ownerName: string,
  contribution: ExtensionContribution,
): OwnedContribution => ({
  ownerName,
  ...(contribution.instructions === undefined
    ? {}
    : { instructions: contribution.instructions }),
  tools: [...(contribution.tools ?? [])],
  hooks: [...(contribution.hooks ?? [])],
});

const assertStableHooks = (
  previous: OwnedContribution | undefined,
  next: OwnedContribution,
): void => {
  if (!previous) {
    return;
  }
  const stable =
    previous.hooks.length === next.hooks.length &&
    previous.hooks.every((hook, index) => hook === next.hooks[index]);
  if (!stable) {
    throw new Error(
      `Extension '${next.ownerName}' changed its hooks during reconciliation.`,
    );
  }
};

const mergeTools = (
  hostTools: readonly Tool[],
  entries: ReadonlyMap<string, OwnedContribution>,
): Tool[] => {
  const merged: Tool[] = [];
  const owners = new Map<string, string>();
  for (const [ownerName, tools] of toolGroups(hostTools, entries)) {
    for (const candidate of tools) {
      const previousOwner = owners.get(candidate.name);
      if (previousOwner) {
        throw new Error(
          `Tool '${candidate.name}' from '${ownerName}' collides with '${previousOwner}'.`,
        );
      }
      owners.set(candidate.name, ownerName);
      merged.push(candidate);
    }
  }
  return merged;
};

const toolGroups = (
  hostTools: readonly Tool[],
  entries: ReadonlyMap<string, OwnedContribution>,
): Array<readonly [string, readonly Tool[]]> => [
  ['host', hostTools],
  ...[...entries.values()].map(
    (entry) => [entry.ownerName, entry.tools] as const,
  ),
];

const mergeInstructions = (
  hostInstructions: string,
  entries: ReadonlyMap<string, OwnedContribution>,
): string =>
  [hostInstructions, instructionsFrom(entries)]
    .filter((part) => part.length > 0)
    .join('\n\n');

const instructionsFrom = (
  entries: ReadonlyMap<string, OwnedContribution>,
): string =>
  [...entries.values()]
    .map((entry) => entry.instructions ?? '')
    .filter((instructions) => instructions.length > 0)
    .join('\n\n');

const hooksFrom = (entries: ReadonlyMap<string, OwnedContribution>): Hook[] =>
  [...entries.values()].flatMap((entry) => [...entry.hooks]);

const toolsFrom = (entries: ReadonlyMap<string, OwnedContribution>): Tool[] =>
  [...entries.values()].flatMap((entry) => [...entry.tools]);

const append = (base: string, addition: string): string =>
  base ? `${base}\n\n${addition}` : addition;
