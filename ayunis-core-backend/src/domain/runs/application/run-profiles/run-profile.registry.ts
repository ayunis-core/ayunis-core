import { Injectable } from '@nestjs/common';
import { ChatRunProfile } from './chat-run-profile';
import type { RunProfile } from './run-profile';
import type { RunProfileId } from './run-profile-input';

@Injectable()
export class RunProfileRegistry {
  private readonly profiles: Record<RunProfileId, RunProfile>;

  constructor(chatRunProfile: ChatRunProfile) {
    this.profiles = { chat: chatRunProfile };
  }

  get(id: RunProfileId): RunProfile {
    return this.profiles[id];
  }
}
