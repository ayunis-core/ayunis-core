import { Injectable, Logger } from '@nestjs/common';
import { SplitResult } from '../../../domain/split-result.entity';
import { SplitterHandlerRegistry } from '../../splitter-handler.registry';
import { SplitTextCommand } from './split-text.command';

@Injectable()
export class SplitTextUseCase {
  private readonly logger = new Logger(SplitTextUseCase.name);

  constructor(private readonly providerRegistry: SplitterHandlerRegistry) {}

  execute(command: SplitTextCommand): SplitResult {
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
