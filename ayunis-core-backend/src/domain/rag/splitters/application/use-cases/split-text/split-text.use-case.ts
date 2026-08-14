import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SplitResult } from 'src/domain/rag/splitters/domain/split-result.entity';
import { SplitterHandlerRegistry } from '../../splitter-handler.registry';
import { SplitTextCommand } from './split-text.command';

@Injectable()
export class SplitTextUseCase {
  constructor(
    @InjectPinoLogger(SplitTextUseCase.name)
    private readonly logger: PinoLogger,
    private readonly providerRegistry: SplitterHandlerRegistry,
  ) {}

  execute(command: SplitTextCommand): SplitResult {
    const handler = this.providerRegistry.getHandler(command.type);

    this.logger.debug(
      { type: command.type },
      'Processing text with splitter provider',
    );

    return handler.processText({
      text: command.text,
      metadata: command.metadata,
    });
  }
}
