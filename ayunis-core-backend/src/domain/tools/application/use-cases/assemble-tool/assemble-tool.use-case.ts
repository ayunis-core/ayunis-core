import { Injectable } from '@nestjs/common';
import { AssembleToolCommand } from './assemble-tool.command';

import { ToolFactory } from '../../tool.factory';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolConfigRepository } from '../../ports/tool-config.repository';

@Injectable()
export class AssembleToolUseCase {
  constructor(
    private readonly toolFactory: ToolFactory,
    private readonly toolConfigRepository: ToolConfigRepository,
  ) {}

  async execute(command: AssembleToolCommand): Promise<Tool> {
    if (command.configId) {
      const config = await this.toolConfigRepository.findOne(
        command.configId,
        command.userId,
      );
      return this.toolFactory.createTool({
        type: command.type,
        config: config,
        context: command.context,
      });
    }
    return this.toolFactory.createTool({
      type: command.type,
      context: command.context,
    });
  }
}
