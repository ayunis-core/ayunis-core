import { UUID, randomUUID } from 'crypto';

export class UserSystemPrompt {
  id: UUID;
  userId: UUID;
  systemPrompt: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    systemPrompt: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.systemPrompt = params.systemPrompt;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
