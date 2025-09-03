import { Column, Entity, ManyToOne, Index } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { ThreadRecord } from '../../../../../threads/infrastructure/persistence/local/schema/thread.record';
import { MessageRole } from '../../../../domain/value-objects/message-role.object';
import { MessageContentType } from '../../../../domain/value-objects/message-content-type.object';
import { UUID } from 'crypto';

interface TextMessageContentData {
  type: MessageContentType.TEXT;
  text: string;
}

interface ToolUseMessageContentData {
  type: MessageContentType.TOOL_USE;
  id: string;
  name: string;
  params: Record<string, any>;
}

interface ToolResultMessageContentData {
  type: MessageContentType.TOOL_RESULT;
  toolId: string;
  toolName: string;
  result: string;
}

interface ThinkingMessageContentData {
  type: MessageContentType.THINKING;
  thinking: string;
}

type MessageContentData =
  | TextMessageContentData
  | ToolUseMessageContentData
  | ToolResultMessageContentData
  | ThinkingMessageContentData;

@Entity({ name: 'messages' })
export class MessageRecord extends BaseRecord {
  @Column({ type: 'uuid' })
  @Index()
  threadId: UUID;

  @ManyToOne(() => ThreadRecord, (thread) => thread.messages, {
    onDelete: 'CASCADE',
  })
  thread: ThreadRecord;

  @Column({
    type: 'enum',
    enum: MessageRole,
  })
  role: MessageRole;

  @Column({ type: 'jsonb' })
  content: MessageContentData[];
}
