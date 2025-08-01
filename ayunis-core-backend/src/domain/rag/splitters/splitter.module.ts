import { Module } from '@nestjs/common';
import { RecursiveSplitterHandler } from './infrastructure/handlers/recursive.splitter';
import { LineSplitterHandler } from './infrastructure/handlers/line.splitter';
import { SplitterType } from './domain/splitter-type.enum';
import { SplitterHandlerRegistry } from './application/splitter-handler.registry';
import { ProcessTextUseCase } from './application/use-cases/process-text/process-text.use-case';

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
    ProcessTextUseCase,
    RecursiveSplitterHandler,
    LineSplitterHandler,
  ],
  exports: [ProcessTextUseCase],
})
export class SplitterModule {}
