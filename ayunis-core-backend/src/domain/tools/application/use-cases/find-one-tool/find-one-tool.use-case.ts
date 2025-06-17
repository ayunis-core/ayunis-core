import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '../../../domain/tool.entity';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { ToolFactory } from '../../tool.factory';
import {
  FindOneToolQuery,
  FindOneConfigurableToolQuery,
} from './find-one-tool.query';

@Injectable()
export class FindOneToolUseCase {
  private readonly logger = new Logger(FindOneToolUseCase.name);

  constructor(
    private readonly toolConfigRepository: ToolConfigRepository,
    private readonly toolFactory: ToolFactory,
  ) {}

  async execute(query: FindOneToolQuery): Promise<Tool> {
    this.logger.log('execute', query);

    if (query instanceof FindOneConfigurableToolQuery) {
      const config = await this.toolConfigRepository.findOne(
        query.configId,
        query.userId,
      );
      return this.toolFactory.createTool(query.type, config);
    } else {
      return this.toolFactory.createTool(query.type);
    }
  }
}
