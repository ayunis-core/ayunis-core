import { UUID } from 'crypto';
import { ToolConfig } from 'src/domain/tools/domain/tool-config.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export abstract class ToolConfigRepository {
  abstract findOne(id: UUID, userId: UUID): Promise<ToolConfig>;
  abstract findMany(ids: UUID[], userId: UUID): Promise<ToolConfig[]>;
  abstract findAll(
    userId: UUID,
    filters?: { type?: ToolType },
  ): Promise<ToolConfig[]>;
  abstract create(toolConfig: ToolConfig, userId: UUID): Promise<ToolConfig>;
  abstract update(toolConfig: ToolConfig, userId: UUID): Promise<ToolConfig>;
  abstract delete(id: UUID, userId: UUID): Promise<void>;
}
