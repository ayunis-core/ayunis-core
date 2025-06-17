import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '../../../domain/tool.entity';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { ToolFactory } from '../../tool.factory';
import { FindAllUserToolsQuery } from './find-all-user-tools.query';

@Injectable()
export class FindAllUserToolsUseCase {
  private readonly logger = new Logger(FindAllUserToolsUseCase.name);

  constructor(
    private readonly toolConfigRepository: ToolConfigRepository,
    private readonly toolFactory: ToolFactory,
  ) {}

  async execute(query: FindAllUserToolsQuery): Promise<Tool[]> {
    this.logger.log('execute', query);

    const configs = await this.toolConfigRepository.findAll(query.userId);
    return configs.map((config) =>
      this.toolFactory.createTool(config.type, config),
    );
  }
}
