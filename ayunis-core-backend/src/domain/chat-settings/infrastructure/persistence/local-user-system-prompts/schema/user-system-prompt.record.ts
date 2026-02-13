import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { Column, Entity, Index } from 'typeorm';

@Entity({ name: 'user_system_prompts' })
export class UserSystemPromptRecord extends BaseRecord {
  @Column({ nullable: false })
  @Index({ unique: true })
  userId: UUID;

  @Column({ type: 'text', nullable: false })
  systemPrompt: string;
}
