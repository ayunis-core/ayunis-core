import type { UUID } from 'crypto';
import { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';

export class CreateRoutineCommand {
  readonly name: string;
  readonly prompt: string;
  /** Omitted: the user's default model. */
  readonly modelId?: UUID;
  readonly dailyTime: string;
  readonly internetAccess: RoutineInternetAccess;
  readonly allowedDomains: string[];
  readonly enabled: boolean;
  readonly sourceToolCallId?: string;

  constructor(params: {
    name: string;
    prompt: string;
    modelId?: UUID;
    dailyTime: string;
    internetAccess?: RoutineInternetAccess;
    allowedDomains?: string[];
    enabled?: boolean;
    sourceToolCallId?: string;
  }) {
    this.name = params.name;
    this.prompt = params.prompt;
    this.modelId = params.modelId;
    this.dailyTime = params.dailyTime;
    this.internetAccess = params.internetAccess ?? RoutineInternetAccess.OFF;
    this.allowedDomains = params.allowedDomains ?? [];
    this.enabled = params.enabled ?? true;
    this.sourceToolCallId = params.sourceToolCallId;
  }
}
