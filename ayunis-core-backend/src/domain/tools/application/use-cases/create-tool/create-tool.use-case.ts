import { Injectable, Logger } from '@nestjs/common';
import {
  CreateToolCommand,
  CreateHttpToolCommand,
} from './create-tool.command';
import { Tool } from '../../../domain/tool.entity';
import {
  HttpTool,
  HttpToolConfig,
} from '../../../domain/tools/http-tool.entity';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { ToolFactory } from '../../tool.factory';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';

@Injectable()
export class CreateToolUseCase {
  private readonly logger = new Logger(CreateToolUseCase.name);

  constructor(
    private readonly toolConfigRepository: ToolConfigRepository,
    private readonly toolFactory: ToolFactory,
  ) {}

  async execute(command: CreateToolCommand): Promise<Tool> {
    this.logger.log('execute', command);

    if (command instanceof CreateHttpToolCommand) {
      return this.createHttpTool(command);
    } else {
      throw new Error(`Unsupported tool type: ${command.type}`);
    }
  }

  private async createHttpTool(
    command: CreateHttpToolCommand,
  ): Promise<HttpTool> {
    this.logger.log('createHttpTool', command);

    const toolConfig = new HttpToolConfig({
      displayName: command.displayName,
      description: command.description,
      userId: command.userId,
      endpointUrl: command.endpointUrl,
      method: command.method,
    });

    const savedConfig = await this.toolConfigRepository.create(
      toolConfig,
      command.userId,
    );

    return this.toolFactory.createTool(ToolType.HTTP, savedConfig) as HttpTool;
  }
}
