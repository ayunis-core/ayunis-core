import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AssembleToolCommand } from './assemble-tool.command';

import { ToolFactory } from '../../tool.factory';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedToolError } from '../../tools.errors';

@Injectable()
export class AssembleToolUseCase {
  constructor(
    private readonly toolFactory: ToolFactory,
    private readonly toolConfigRepository: ToolConfigRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedToolError)
  async execute(command: AssembleToolCommand): Promise<Tool> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    if (command.configId) {
      const config = await this.toolConfigRepository.findOne(
        command.configId,
        userId,
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
