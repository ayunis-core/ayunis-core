import { Module } from '@nestjs/common';
import { getLoggerToken, type PinoLogger } from 'nestjs-pino';
import { RecursiveSplitterHandler } from './infrastructure/handlers/recursive.splitter';
import { SplitterType } from './domain/splitter-type.enum';
import { SplitterHandlerRegistry } from './application/splitter-handler.registry';
import { SplitTextUseCase } from './application/use-cases/split-text/split-text.use-case';

@Module({
  providers: [
    {
      provide: SplitterHandlerRegistry,
      useFactory: (
        recursiveSplitterHandler: RecursiveSplitterHandler,
        logger: PinoLogger,
      ) => {
        const registry = new SplitterHandlerRegistry(logger);
        registry.registerHandler(
          SplitterType.RECURSIVE,
          recursiveSplitterHandler,
        );
        return registry;
      },
      inject: [
        RecursiveSplitterHandler,
        getLoggerToken(SplitterHandlerRegistry.name),
      ],
    },
    SplitTextUseCase,
    RecursiveSplitterHandler,
  ],
  exports: [SplitTextUseCase],
})
export class SplitterModule {}
