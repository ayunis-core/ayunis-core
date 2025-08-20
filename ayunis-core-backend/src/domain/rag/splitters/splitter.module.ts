import { Module } from '@nestjs/common';
import { RecursiveSplitterHandler } from './infrastructure/handlers/recursive.splitter';
import { LineSplitterHandler } from './infrastructure/handlers/line.splitter';
import { SplitterType } from './domain/splitter-type.enum';
import { SplitterHandlerRegistry } from './application/splitter-handler.registry';
import { SplitTextUseCase } from './application/use-cases/split-text/split-text.use-case';

@Module({
  providers: [
    {
      provide: SplitterHandlerRegistry,
      useFactory: (
        recursiveSplitterHandler: RecursiveSplitterHandler,
        lineSplitterHandler: LineSplitterHandler,
      ) => {
        const registry = new SplitterHandlerRegistry();
        registry.registerHandler(
          SplitterType.RECURSIVE,
          recursiveSplitterHandler,
        );
        registry.registerHandler(SplitterType.LINE, lineSplitterHandler);
        return registry;
      },
      inject: [RecursiveSplitterHandler, LineSplitterHandler],
    },
    SplitTextUseCase,
    RecursiveSplitterHandler,
    LineSplitterHandler,
  ],
  exports: [SplitTextUseCase],
})
export class SplitterModule {}
