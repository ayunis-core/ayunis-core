import type { UUID } from 'crypto';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import type { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';
import type { RoutineScheduleInput } from 'src/domain/routines/domain/routine-frequency';

/**
 * Omitted properties stay unchanged. A sent `modelId` or `mode` replaces the
 * model choice as a whole; null in both means the user's default.
 */
export class UpdateRoutineCommand {
  readonly id: UUID;
  readonly name?: string;
  readonly prompt?: string;
  readonly modelId?: UUID | null;
  readonly mode?: ModelMode | null;
  /** Replaces the whole schedule. */
  readonly schedule?: RoutineScheduleInput;
  readonly internetAccess?: RoutineInternetAccess;
  readonly allowedDomains?: string[];
  readonly enabled?: boolean;

  constructor(params: {
    id: UUID;
    name?: string;
    prompt?: string;
    modelId?: UUID | null;
    mode?: ModelMode | null;
    schedule?: RoutineScheduleInput;
    internetAccess?: RoutineInternetAccess;
    allowedDomains?: string[];
    enabled?: boolean;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.prompt = params.prompt;
    this.modelId = params.modelId;
    this.mode = params.mode;
    this.schedule = params.schedule;
    this.internetAccess = params.internetAccess;
    this.allowedDomains = params.allowedDomains;
    this.enabled = params.enabled;
  }
}
