import type { UUID } from 'crypto';
import type { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';

/** Omitted properties stay unchanged; a null model means the user's default. */
export class UpdateRoutineCommand {
  readonly id: UUID;
  readonly name?: string;
  readonly prompt?: string;
  readonly modelId?: UUID | null;
  readonly dailyTime?: string;
  readonly internetAccess?: RoutineInternetAccess;
  readonly allowedDomains?: string[];
  readonly enabled?: boolean;

  constructor(params: {
    id: UUID;
    name?: string;
    prompt?: string;
    modelId?: UUID | null;
    dailyTime?: string;
    internetAccess?: RoutineInternetAccess;
    allowedDomains?: string[];
    enabled?: boolean;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.prompt = params.prompt;
    this.modelId = params.modelId;
    this.dailyTime = params.dailyTime;
    this.internetAccess = params.internetAccess;
    this.allowedDomains = params.allowedDomains;
    this.enabled = params.enabled;
  }
}
