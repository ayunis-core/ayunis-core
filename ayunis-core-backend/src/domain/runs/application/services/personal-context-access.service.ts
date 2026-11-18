import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlag } from 'src/config/features.config';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { RunProfileInput } from 'src/domain/runs/application/run-profiles/run-profile-input';

/** What a run may know about its user from outside the current chat. */
export interface PersonalContextAccess {
  readonly memory: boolean;
  /** The user's earlier chats: `chat_list`, `chat_grep` and `chat_read`. */
  readonly chatHistory: boolean;
}

/**
 * The one gate for personal context. Only chat runs get it, never anonymous
 * ones (anonymization does not cover the system prompt, and stored memory
 * would hold `{{pii:…}}` placeholders that mean nothing outside the thread),
 * only with the feature on, and for memory only when the effective grant of
 * the run's model allows it. Runs resolve it afresh, so a changed grant
 * applies from the next message.
 */
@Injectable()
export class PersonalContextAccessService {
  constructor(private readonly configService: ConfigService) {}

  resolve(params: {
    profile: RunProfileInput;
    isAnonymous: boolean;
    permit: PermittedLanguageModel;
  }): PersonalContextAccess {
    const eligible =
      params.profile.id === 'chat' && !params.isAnonymous && this.isEnabled();
    return {
      memory: eligible && params.permit.memoryAccess,
      chatHistory: eligible,
    };
  }

  private isEnabled(): boolean {
    return Boolean(
      this.configService.get<boolean>(`features.${FeatureFlag.Memory}`),
    );
  }
}
