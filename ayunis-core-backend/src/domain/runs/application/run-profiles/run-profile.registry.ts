import { Injectable } from '@nestjs/common';
import { ChatRunProfile } from './chat-run-profile';
import { OutlookRunProfile } from './outlook-run-profile';
import { RoutineRunProfile } from './routine-run-profile';
import type { RunProfile } from './run-profile';
import type { RunProfileId } from './run-profile-input';

@Injectable()
export class RunProfileRegistry {
  private readonly profiles: Record<RunProfileId, RunProfile>;

  constructor(
    chatRunProfile: ChatRunProfile,
    outlookRunProfile: OutlookRunProfile,
    routineRunProfile: RoutineRunProfile,
  ) {
    this.profiles = {
      chat: chatRunProfile,
      outlook: outlookRunProfile,
      routine: routineRunProfile,
    };
  }

  get(id: RunProfileId): RunProfile {
    return this.profiles[id];
  }
}
