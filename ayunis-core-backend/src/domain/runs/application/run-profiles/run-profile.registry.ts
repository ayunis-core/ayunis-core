import { Injectable } from '@nestjs/common';
import { ChatRunProfile } from './chat-run-profile';
import { RoutineRunProfile } from './routine-run-profile';
import type { RunProfile } from './run-profile';
import type { RunProfileId } from './run-profile-input';

@Injectable()
export class RunProfileRegistry {
  private readonly profiles: Record<RunProfileId, RunProfile>;

  constructor(
    chatRunProfile: ChatRunProfile,
    routineRunProfile: RoutineRunProfile,
  ) {
    this.profiles = { chat: chatRunProfile, routine: routineRunProfile };
  }

  get(id: RunProfileId): RunProfile {
    return this.profiles[id];
  }
}
