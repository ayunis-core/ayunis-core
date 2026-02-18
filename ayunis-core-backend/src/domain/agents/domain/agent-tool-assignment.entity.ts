import { Tool } from 'src/domain/tools/domain/tool.entity';
import { randomUUID, UUID } from 'crypto';

export class AgentToolAssignment {
  public readonly id: UUID;
  public readonly tool: Tool;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    tool: Tool;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.tool = params.tool;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
