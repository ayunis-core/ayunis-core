import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '../../../domain/tool.entity';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { ToolFactory } from '../../tool.factory';
import { FindManyToolsQuery } from './find-many-tools.query';

@Injectable()
export class FindManyToolsUseCase {
  private readonly logger = new Logger(FindManyToolsUseCase.name);

  constructor(
    private readonly toolConfigRepository: ToolConfigRepository,
    private readonly toolFactory: ToolFactory,
  ) {}

  async execute(query: FindManyToolsQuery): Promise<Tool[]> {
    this.logger.log('execute', query);

    const configs = await this.toolConfigRepository.findMany(
      query.toolIds,
      query.userId,
    );
    return configs.map((config) =>
      this.toolFactory.createTool(config.type, config),
    );
  }
}
