import { Injectable } from '@nestjs/common';
import { ChatRunProfile } from 'src/domain/runs/application/run-profiles/chat-run-profile';
import { OutlookRunProfile } from 'src/domain/runs/application/run-profiles/outlook-run-profile';
import { RoutineRunProfile } from 'src/domain/runs/application/run-profiles/routine-run-profile';
import type { RunProfile } from 'src/domain/runs/application/run-profiles/run-profile';
import type { RunProfileId } from 'src/domain/runs/application/run-profiles/run-profile-input';

@Injectable()
export class RunProfileRegistry {
  private readonly profiles: Record<RunProfileId, RunProfile>;

  constructor(
    chatRunProfile: ChatRunProfile,
    outlookRunProfile: OutlookRunProfile,
    routineRunProfile: RoutineRunProfile,
  ) {
    this.profiles = {
      [chatRunProfile.id]: chatRunProfile,
      [outlookRunProfile.id]: outlookRunProfile,
      routine: routineRunProfile,
    };
  }

  get(id: RunProfileId): RunProfile {
    return this.profiles[id];
  }
}
