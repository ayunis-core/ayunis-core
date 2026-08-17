import {
  DuplicateExtensionError,
  type ConfiguredExtension,
  type ExtensionApi,
  type ExtensionContext,
  type ExtensionContribution,
  type ExtensionDefinitionIdentity,
  type ExtensionSetup,
} from '@ayunis/agent-extensions';
import type {
  BeforeModelCallContext,
  Hook,
  HookApi,
  RunContext,
  Tool,
} from '@ayunis/agent-runtime';

import { ApiRegistry } from './api-registry';
import { CleanupStack } from './cleanup-stack';
import {
  ContributionStore,
  type ContributionPlan,
  type ToolMerge,
} from './contributions';
import { wrapHook } from './hook-wrapper';
import { StateCell } from './state-cell';
import { ExtensionTransaction } from './transaction';

interface RuntimeDefinition extends ExtensionDefinitionIdentity {
  setup(
    context: ExtensionContext,
    config: unknown,
  ):
    | ExtensionSetup<unknown, unknown>
    | Promise<ExtensionSetup<unknown, unknown>>;
  contribute(
    projection: { state: unknown; api: unknown },
    config: unknown,
  ): ExtensionContribution;
}

interface RuntimeConfiguredExtension {
  readonly definition: RuntimeDefinition;
  readonly config: unknown;
}

interface EngineEntry extends RuntimeConfiguredExtension {
  readonly state: StateCell<unknown>;
  readonly api: unknown;
}

export interface EngineComposition {
  readonly instructions: string;
  readonly tools: Tool[];
  readonly hooks: Hook[];
}

export class ExtensionEngine {
  private readonly cleanup = new CleanupStack();
  private readonly transaction = new ExtensionTransaction(this.cleanup);
  private readonly registry = new ApiRegistry();
  private readonly contributions = new ContributionStore();
  private readonly entries: EngineEntry[] = [];
  private readonly dirtyOwners = new Set<string>();
  private projecting = false;
  private disposed = false;
  private composed = false;
  private getProspectiveTools?: () => readonly Tool[];

  private constructor(
    private readonly configured: readonly RuntimeConfiguredExtension[],
    private readonly context: RunContext,
  ) {}

  static async create(
    configured: readonly ConfiguredExtension[],
    context: RunContext,
  ): Promise<ExtensionEngine> {
    const runtimeConfigured = configured.map(toRuntimeConfigured);
    assertUniqueDefinitions(runtimeConfigured);
    const engine = new ExtensionEngine(runtimeConfigured, context);
    try {
      await engine.setup();
      return engine;
    } catch (error) {
      await engine.rollbackSetup(error);
      throw error;
    }
  }

  compose(host: {
    instructions: string;
    tools: readonly Tool[];
  }): EngineComposition {
    this.assertActive();
    const projected = this.project(new Set(this.entries.map(entryName)));
    const composition = this.contributions.initialize(host, projected);
    this.dirtyOwners.clear();
    this.composed = true;
    return {
      ...composition,
      hooks: [
        ...composition.hooks.map((hook) =>
          wrapHook(hook, this.context, (hookContext) =>
            this.captureProspectiveTools(hookContext),
          ),
        ),
        this.lifecycleHook(),
      ],
    };
  }

  getApi<Definition extends ExtensionDefinitionIdentity>(
    definition: Definition,
  ): ExtensionApi<Definition> {
    return this.registry.use('agent engine', definition);
  }

  async runTransaction<Result>(
    operation: () => Result | Promise<Result>,
  ): Promise<Result> {
    this.assertActive();
    if (!this.composed) {
      throw new Error('Compose extension contributions before a transaction.');
    }
    return this.transaction.run(operation, () => this.validateTransaction());
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    await this.cleanup.dispose();
  }

  private async setup(): Promise<void> {
    for (const configured of this.configured) {
      const cells = new Set<StateCell<unknown>>();
      const context = this.setupContext(configured.definition.name, cells);
      const setup = await configured.definition.setup(
        context,
        configured.config,
      );
      if (!(setup.state instanceof StateCell) || !cells.has(setup.state)) {
        throw new Error(
          `Extension '${configured.definition.name}' returned state not created by its setup context.`,
        );
      }
      const entry: EngineEntry = {
        ...configured,
        ...setup,
        state: setup.state,
      };
      this.entries.push(entry);
      this.registry.register(
        configured.definition,
        configured.definition.name,
        setup.api,
      );
    }
  }

  private setupContext(
    ownerName: string,
    cells: Set<StateCell<unknown>>,
  ): ExtensionContext {
    return {
      extensionName: ownerName,
      state: <State>(initial: State) => {
        const cell = new StateCell(initial, {
          ownerName,
          transaction: this.transaction,
          isProjecting: () => this.projecting,
          isDisposed: () => this.disposed,
          markDirty: (name) => this.dirtyOwners.add(name),
        });
        cells.add(cell);
        return cell;
      },
      use: (definition) => this.registry.use(ownerName, definition),
      useOptional: (definition) => this.registry.useOptional(definition),
      own: (cleanup) => {
        this.assertMutableSetup(ownerName);
        this.transaction.own(cleanup);
      },
    };
  }

  private project(
    owners: ReadonlySet<string>,
  ): Map<string, ExtensionContribution> {
    this.projecting = true;
    try {
      const projected = new Map<string, ExtensionContribution>();
      for (const entry of this.entries) {
        if (owners.has(entry.definition.name)) {
          projected.set(entry.definition.name, this.projectEntry(entry));
        }
      }
      return projected;
    } finally {
      this.projecting = false;
    }
  }

  private projectEntry(entry: EngineEntry): ExtensionContribution {
    const contribution = projectEntry(entry);
    if (!contribution.tools) {
      return contribution;
    }
    return {
      ...contribution,
      tools: contribution.tools.map((tool) => this.transactionalTool(tool)),
    };
  }

  private transactionalTool(tool: Tool): Tool {
    const execute = tool.execute?.bind(tool);
    if (!execute) {
      return tool;
    }
    return {
      ...tool,
      execute: (input, context) =>
        this.runTransaction(() => execute(input, context)),
    };
  }

  private lifecycleHook(): Hook {
    return {
      name: 'agent-extension-engine',
      runStart: (context) => this.captureHookContext(context),
      beforeModelCall: (context) => {
        this.captureHookContext(context);
        this.reconcile(context);
      },
      afterModelCall: (context) => this.captureHookContext(context),
      modelCallInterrupted: (context) => this.captureHookContext(context),
      beforeToolCall: (context) => this.captureHookContext(context),
      afterToolCall: (context) => this.captureHookContext(context),
      runEnd: async (context) => {
        this.assertHookContext(context.context);
        await this.dispose();
      },
    };
  }

  private reconcile(context: BeforeModelCallContext): void {
    const owners = new Set(this.dirtyOwners);
    const plan = this.contributions.createPlan(this.project(owners));
    let tools: ToolMerge | undefined;
    context.transformTools((prospective) => {
      tools = this.contributions.mergeTools(plan, prospective);
      return [...tools.tools];
    });
    context.transformInstructions((prospective) => {
      if (!tools) {
        throw new Error('Tool reconciliation did not run before instructions.');
      }
      return this.commitReconciliation(plan, tools, prospective, owners);
    });
  }

  private commitReconciliation(
    plan: ContributionPlan,
    tools: ToolMerge,
    prospective: string,
    owners: ReadonlySet<string>,
  ): string {
    const instructions = this.contributions.mergeInstructions(
      plan,
      prospective,
    );
    this.contributions.commit(plan, tools, prospective, instructions);
    for (const owner of owners) {
      this.dirtyOwners.delete(owner);
    }
    return instructions;
  }

  private validateTransaction(): void {
    this.synchronizePendingTools();
    const owners = this.transaction.changedOwners;
    if (owners.size === 0) {
      return;
    }
    const plan = this.contributions.createPlan(this.project(owners));
    this.contributions.validate(plan);
  }

  private captureHookContext(context: HookApi): void {
    this.assertHookContext(context.context);
    this.captureProspectiveTools(context);
  }

  private captureProspectiveTools(context: HookApi): void {
    this.getProspectiveTools = () => context.getProspectiveTools();
    this.synchronizePendingTools();
  }

  private synchronizePendingTools(): void {
    if (this.getProspectiveTools) {
      this.contributions.synchronizeTools(this.getProspectiveTools());
    }
  }

  private assertMutableSetup(ownerName: string): void {
    this.assertActive();
    if (this.projecting) {
      throw new Error(
        `Extension '${ownerName}' cannot acquire resources during projection.`,
      );
    }
  }

  private assertHookContext(actual: RunContext): void {
    if (actual !== this.context) {
      throw new Error(
        'A run-scoped extension hook was invoked with a different runtime context.',
      );
    }
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('The extension engine has been disposed.');
    }
  }

  private async rollbackSetup(setupError: unknown): Promise<void> {
    try {
      await this.dispose();
    } catch (cleanupError) {
      throw new AggregateError(
        [setupError, cleanupError],
        'Extension setup and rollback cleanup failed.',
      );
    }
  }
}

const toRuntimeConfigured = (
  configured: ConfiguredExtension,
): RuntimeConfiguredExtension =>
  configured as unknown as RuntimeConfiguredExtension;

const assertUniqueDefinitions = (
  configured: readonly RuntimeConfiguredExtension[],
): void => {
  const definitions = new Set<ExtensionDefinitionIdentity>();
  const names = new Set<string>();
  for (const extension of configured) {
    const definition = extension.definition;
    if (definitions.has(definition) || names.has(definition.name)) {
      throw new DuplicateExtensionError(definition.name);
    }
    definitions.add(definition);
    names.add(definition.name);
  }
};

const projectEntry = (entry: EngineEntry): ExtensionContribution => {
  try {
    return entry.definition.contribute(
      { state: entry.state.current, api: entry.api },
      entry.config,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Projection failed.';
    throw new Error(
      `Extension '${entry.definition.name}' contribution failed: ${message}`,
      { cause: error },
    );
  }
};

const entryName = (entry: EngineEntry): string => entry.definition.name;
