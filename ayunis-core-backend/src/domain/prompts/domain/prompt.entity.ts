import { UUID, randomUUID } from 'crypto';

export class Prompt {
  public readonly id: UUID;
  public readonly title: string;
  public readonly content: string;
  public readonly userId: UUID;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    title: string;
    content: string;
    userId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.title = params.title;
    this.content = params.content;
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
