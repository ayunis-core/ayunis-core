import { randomUUID, UUID } from 'crypto';
import { ToolType } from './value-objects/tool-type.enum';

export class ToolConfig {
  public readonly id: UUID;
  public readonly type: ToolType;
  public readonly displayName: string;
  public readonly userId: UUID;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    type: ToolType;
    displayName: string;
    userId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.type = params.type;
    this.displayName = params.displayName;
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
