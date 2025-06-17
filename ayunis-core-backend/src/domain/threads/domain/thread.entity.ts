import { UUID, randomUUID } from 'crypto';
import { Message } from 'src/domain/messages/domain/message.entity';
import { Source } from 'src/domain/sources/domain/source.entity';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelConfig } from 'src/domain/models/domain/model-config.entity';

export class Thread {
  id: UUID;
  userId: UUID;
  model: PermittedModel;
  modelConfig?: ModelConfig;
  title?: string;
  instruction?: string;
  messages: Message[];
  sources?: Source[];
  isInternetSearchEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    model: PermittedModel;
    modelConfig?: ModelConfig;
    title?: string;
    instruction?: string;
    messages: Message[];
    sources?: Source[];
    isInternetSearchEnabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.model = params.model;
    this.modelConfig = params.modelConfig;
    this.title = params.title;
    this.instruction = params.instruction;
    this.messages = params.messages;
    this.sources = params.sources || [];
    this.isInternetSearchEnabled = params.isInternetSearchEnabled ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  getLastMessage(): Message | undefined {
    return this.messages.at(-1);
  }
}
