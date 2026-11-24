import type { UUID } from 'crypto';
import type { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';
import type { RoutineScheduleInput } from 'src/domain/routines/domain/routine-frequency';

/** Omitted properties stay unchanged; a null model means the user's default. */
export class UpdateRoutineCommand {
  readonly id: UUID;
  readonly name?: string;
  readonly prompt?: string;
  readonly modelId?: UUID | null;
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
    schedule?: RoutineScheduleInput;
    internetAccess?: RoutineInternetAccess;
    allowedDomains?: string[];
    enabled?: boolean;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.prompt = params.prompt;
    this.modelId = params.modelId;
    this.schedule = params.schedule;
    this.internetAccess = params.internetAccess;
    this.allowedDomains = params.allowedDomains;
    this.enabled = params.enabled;
  }
}
