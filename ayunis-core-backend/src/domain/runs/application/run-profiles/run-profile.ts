import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import type { RunCapability } from 'src/domain/runs/application/run-capabilities/run-capability';
import type { RunProfileId } from './run-profile-input';

/** What a completion policy sees once a run of its profile has completed. */
export interface CompletedRun {
  /** The run's final assistant turn; absent when the model produced none. */
  readonly lastAssistantMessage?: AssistantMessage;
  /** Nudges already sent in this execution. */
  readonly nudges: number;
}

/**
 * `done` ends the execution, `nudge` sends `message` as a new user message and
 * runs again, `failed` ends it unsuccessfully.
 */
export type RunCompletionDecision =
  | { readonly status: 'done' }
  | { readonly status: 'nudge'; readonly message: string }
  | { readonly status: 'failed'; readonly reason: string };

export interface RunCompletionPolicy {
  decide(run: CompletedRun): RunCompletionDecision;
}

/** Shared by every profile a user watches; routines have their own. */
export const AYUNIS_PREAMBLE = `You are an AI assistant powered by Ayunis Core, an open-source AI gateway platform designed for public administrations.

<application_details>
Ayunis Core is an AI platform that enables intelligent conversations, customizable skills, and extensible tool integration. It is built for public sector organizations that need sovereign AI solutions with full control over data, models, and integrations.
</application_details>`;

/** The run ends successfully when the model stops calling tools. */
export const DONE_WHEN_MODEL_STOPS: RunCompletionPolicy = {
  decide: () => ({ status: 'done' }),
};

export enum CapabilityLoading {
  /** Contributes to every run. */
  EAGER = 'eager',
  /**
   * Contributes only once the thread has loaded it or the run's context
   * requires it; until then the run only lists it in its capability catalog.
   */
  ON_DEMAND = 'on_demand',
}

export interface ProfileCapability {
  readonly capability: RunCapability;
  readonly loading: CapabilityLoading;
}

export function eager(...capabilities: RunCapability[]): ProfileCapability[] {
  return capabilities.map((capability) => ({
    capability,
    loading: CapabilityLoading.EAGER,
  }));
}

export function onDemand(
  ...capabilities: RunCapability[]
): ProfileCapability[] {
  return capabilities.map((capability) => ({
    capability,
    loading: CapabilityLoading.ON_DEMAND,
  }));
}

export interface RunProfile {
  readonly id: RunProfileId;
  /** Always the first section of the system prompt. */
  readonly preamble: string;
  /** Rendered after the custom instructions, before any run notes. */
  readonly closing?: string;
  /**
   * Ordered: decides tool order and section order within each prompt slot.
   * MCP must stay the last tool-contributing capability, because it drops
   * tools whose names are already reserved.
   */
  readonly capabilities: readonly ProfileCapability[];
  readonly completionPolicy: RunCompletionPolicy;
  /** Model-and-tool iterations allowed in one run. */
  readonly maxIterations: number;
  /**
   * Whether tool calls that need approval wait for the user's confirmation.
   * Only for runs someone watches: nobody could confirm an unattended run.
   */
  readonly asksForToolConfirmation: boolean;
}
