import { Injectable, Logger } from '@nestjs/common';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { DeleteToolCommand } from './delete-tool.command';

@Injectable()
export class DeleteToolUseCase {
  private readonly logger = new Logger(DeleteToolUseCase.name);

  constructor(private readonly toolConfigRepository: ToolConfigRepository) {}

  async execute(command: DeleteToolCommand): Promise<void> {
    this.logger.log('execute', command.id);
    return this.toolConfigRepository.delete(command.id, command.ownerId);
  }
}
