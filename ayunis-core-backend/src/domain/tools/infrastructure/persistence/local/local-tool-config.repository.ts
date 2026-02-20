import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ToolConfigRepository } from 'src/domain/tools/application/ports/tool-config.repository';
import { In, Repository } from 'typeorm';
import { ToolConfigRecord } from './schema/tool-config.record';
import { UUID } from 'crypto';
import { ToolConfig } from 'src/domain/tools/domain/tool-config.entity';
import { ToolConfigMapper } from './mappers/tool-config.mapper';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

@Injectable()
export class LocalToolConfigRepository extends ToolConfigRepository {
  constructor(
    @InjectRepository(ToolConfigRecord)
    private readonly toolConfigRepository: Repository<ToolConfigRecord>,
    private readonly toolConfigMapper: ToolConfigMapper,
  ) {
    super();
  }

  async findOne(id: UUID, userId: UUID): Promise<ToolConfig> {
    const toolConfig = await this.toolConfigRepository.findOne({
      where: { id, userId },
    });
    if (!toolConfig) {
      throw new NotFoundException('Tool config not found');
    }
    return this.toolConfigMapper.toDomain(toolConfig);
  }

  async findMany(ids: UUID[], userId: UUID): Promise<ToolConfig[]> {
    const toolConfigs = await this.toolConfigRepository.find({
      where: { id: In(ids), userId },
    });
    return toolConfigs.map((toolConfig) =>
      this.toolConfigMapper.toDomain(toolConfig),
    );
  }

  async findAll(
    userId: UUID,
    filters?: { type?: ToolType },
  ): Promise<ToolConfig[]> {
    const where: Record<string, unknown> = { userId };
    if (filters?.type) {
      where.type = filters.type;
    }

    const toolConfigs = await this.toolConfigRepository.find({ where });
    return toolConfigs.map((toolConfig) =>
      this.toolConfigMapper.toDomain(toolConfig),
    );
  }

  async create(toolConfig: ToolConfig, userId: UUID): Promise<ToolConfig> {
    return this.save(toolConfig, userId);
  }

  async update(toolConfig: ToolConfig, userId: UUID): Promise<ToolConfig> {
    return this.save(toolConfig, userId);
  }

  private async save(
    toolConfig: ToolConfig,
    userId: UUID,
  ): Promise<ToolConfig> {
    const entity = this.toolConfigMapper.toRecord(toolConfig);
    entity.userId = userId;
    const savedEntity = await this.toolConfigRepository.save(entity);
    return this.toolConfigMapper.toDomain(savedEntity);
  }

  async delete(id: UUID, userId: UUID): Promise<void> {
    await this.toolConfigRepository.delete({ id, userId });
  }
}
