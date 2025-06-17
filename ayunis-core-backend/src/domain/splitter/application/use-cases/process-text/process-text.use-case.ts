import { Injectable, Logger } from '@nestjs/common';
import { SplitResult } from '../../../domain/split-result.entity';
import { SplitterProviderRegistry } from '../../splitter-provider.registry';
import { ProcessTextCommand } from './process-text.command';

@Injectable()
export class ProcessTextUseCase {
  private readonly logger = new Logger(ProcessTextUseCase.name);

  constructor(private readonly providerRegistry: SplitterProviderRegistry) {}

  execute(command: ProcessTextCommand): SplitResult {
    const handler = this.providerRegistry.getHandler(command.provider);

    this.logger.debug(
      `Processing text with splitter provider: ${command.provider}`,
    );

    return handler.processText({
      text: command.text,
      metadata: command.metadata,
    });
  }
}
