import { Injectable } from '@nestjs/common';
import { CreateCustomToolCommand } from './create-custom-tool.command';
import { CustomTool } from 'src/domain/tools/domain/tools/custom-tool.entity';

@Injectable()
export class CreateCustomToolUseCase {
  async execute(command: CreateCustomToolCommand): Promise<CustomTool> {
    return new CustomTool({
      name: command.name,
      description: command.description,
      parameters: command.parameters,
    });
  }
}
