import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class MemoryEntry {
  id: UUID;
  userId: UUID;
  key: string;
  content: string;
  /** One line on when the entry is relevant; shown in the prompt in place of the content. */
  description: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    key: string;
    content: string;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.key = params.key;
    this.content = params.content;
    this.description = params.description ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
