import type { UUID } from 'crypto';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';
import type { RoutineScheduleInput } from 'src/domain/routines/domain/routine-frequency';

export class CreateRoutineCommand {
  readonly name: string;
  readonly prompt: string;
  /** Omitted together with `mode`: the user's default model. */
  readonly modelId?: UUID;
  readonly mode?: ModelMode;
  readonly schedule: RoutineScheduleInput;
  readonly internetAccess: RoutineInternetAccess;
  readonly allowedDomains: string[];
  readonly enabled: boolean;
  readonly sourceToolCallId?: string;
  readonly marketplaceIdentifier?: string;

  constructor(params: {
    name: string;
    prompt: string;
    modelId?: UUID;
    mode?: ModelMode;
    schedule: RoutineScheduleInput;
    internetAccess?: RoutineInternetAccess;
    allowedDomains?: string[];
    enabled?: boolean;
    sourceToolCallId?: string;
    marketplaceIdentifier?: string;
  }) {
    this.name = params.name;
    this.prompt = params.prompt;
    this.modelId = params.modelId;
    this.mode = params.mode;
    this.schedule = params.schedule;
    this.internetAccess = params.internetAccess ?? RoutineInternetAccess.OFF;
    this.allowedDomains = params.allowedDomains ?? [];
    this.enabled = params.enabled ?? true;
    this.sourceToolCallId = params.sourceToolCallId;
    this.marketplaceIdentifier = params.marketplaceIdentifier;
  }
}
