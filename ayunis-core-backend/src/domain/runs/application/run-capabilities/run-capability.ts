import type { IntegrationWarning } from 'src/domain/runs/domain/run-integration-warning';
import type { Hook, Tool as RuntimeTool } from '@ayunis/agent-runtime';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { RunCapabilityContext } from './run-capability-context';

/**
 * Fixed positions of the system prompt, rendered in declaration order after the
 * profile preamble; sections within a slot follow the profile's capability
 * order. Stable framing stays at the front so the prompt prefix survives
 * provider prompt caching. The profile closing renders before `RUN_NOTES`.
 */
export enum PromptSlot {
  FRAMING = 'framing',
  /** Rendered inside `<tool_usage>`, followed by the tools' long descriptions. */
  TOOL_USAGE = 'tool_usage',
  RESOURCES = 'resources',
  POLICIES = 'policies',
  CUSTOM_INSTRUCTIONS = 'custom_instructions',
  /** Notes for a single run; after the closing so they never shift the shared prefix. */
  RUN_NOTES = 'run_notes',
}

export interface PromptSection {
  readonly slot: PromptSlot;
  readonly content: string;
}

export interface RunInstructionsTarget {
  emit?(event: { name: string; data: unknown }): void;
  setTools(tools: RuntimeTool[]): void;
  setInstructions(text: string): void;
}

export interface RunProfileHandle {
  /**
   * Reassembles the run's profile from the thread's current state and swaps
   * the resulting tools and instructions into the running loop.
   */
  refresh(target: RunInstructionsTarget): Promise<void>;
}

export type CapabilityHookFactory = (run: RunProfileHandle) => Hook;

export interface CapabilityContribution {
  readonly warnings?: readonly IntegrationWarning[];
  readonly tools?: readonly Tool[];
  readonly sections?: readonly PromptSection[];
  /** Created once per run; contributions from a refresh are ignored. */
  readonly hooks?: readonly CapabilityHookFactory[];
}

export interface CapabilityAssemblyState {
  /**
   * Names of the tools contributed by the capabilities before this one,
   * including the tools of on-demand capabilities that this run could load,
   * so a name stays taken once its capability is loaded.
   */
  readonly reservedToolNames: ReadonlySet<string>;
  /**
   * The reserved names that this run does not offer yet: they belong to an
   * on-demand capability that is available but not loaded.
   */
  readonly loadableToolNames: ReadonlySet<string>;
}

/** An on-demand capability that this run could load but has not loaded. */
export interface CapabilityCatalogEntry {
  readonly id: string;
  readonly description: string;
  /** The tools the capability contributes once loaded. */
  readonly toolNames: readonly string[];
}

export interface RunCapability {
  /**
   * Stable snake_case id. Threads store the ids of the capabilities they
   * loaded, so it must never be renamed.
   */
  readonly id: string;
  /** Tells the model when to load the capability. */
  readonly description: string;
  /**
   * Whether the run's context needs this capability, so a profile that offers
   * it on demand loads it without the thread having loaded it.
   */
  isRequiredBy?(context: RunCapabilityContext): boolean | Promise<boolean>;
  contribute(
    context: RunCapabilityContext,
    state: CapabilityAssemblyState,
  ): CapabilityContribution | Promise<CapabilityContribution>;
}
