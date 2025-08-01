import { Injectable, Logger } from '@nestjs/common';
import { SplitResult } from '../../../domain/split-result.entity';
import { SplitterHandlerRegistry } from '../../splitter-handler.registry';
import { ProcessTextCommand } from './process-text.command';

@Injectable()
export class ProcessTextUseCase {
  private readonly logger = new Logger(ProcessTextUseCase.name);

  constructor(private readonly providerRegistry: SplitterHandlerRegistry) {}

  execute(command: ProcessTextCommand): SplitResult {
    const handler = this.providerRegistry.getHandler(command.type);

    this.logger.debug(
      `Processing text with splitter provider: ${command.type}`,
    );

    return handler.processText({
      text: command.text,
      metadata: command.metadata,
    });
  }
}
