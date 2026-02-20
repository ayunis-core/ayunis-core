import type { UUID } from 'crypto';
import type { UserSystemPrompt } from '../../domain/user-system-prompt.entity';

export abstract class UserSystemPromptsRepository {
  abstract findByUserId(userId: UUID): Promise<UserSystemPrompt | null>;
  abstract upsert(
    userSystemPrompt: UserSystemPrompt,
  ): Promise<UserSystemPrompt>;
  abstract deleteByUserId(userId: UUID): Promise<void>;
}
