import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class MemoryEntry {
  id: UUID;
  userId: UUID;
  key: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    key: string;
    content: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.key = params.key;
    this.content = params.content;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
