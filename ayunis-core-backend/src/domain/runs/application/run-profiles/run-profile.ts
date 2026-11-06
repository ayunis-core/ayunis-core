import type { RunCapability } from 'src/domain/runs/application/run-capabilities/run-capability';
import type { RunProfileId } from './run-profile-input';

/** `done`: the run ends successfully when the model stops calling tools. */
export type RunCompletionPolicy = 'done';

export interface RunProfile {
  readonly id: RunProfileId;
  /** Always the first section of the system prompt. */
  readonly preamble: string;
  /** Rendered after the custom instructions, before any run notes. */
  readonly closing?: string;
  /** Ordered: decides tool order and section order within each prompt slot. */
  readonly capabilities: readonly RunCapability[];
  readonly completionPolicy: RunCompletionPolicy;
}
