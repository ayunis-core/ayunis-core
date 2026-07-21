import { Module } from '@nestjs/common';
import { RecursiveSplitterHandler } from './infrastructure/handlers/recursive.splitter';
import { SplitterType } from './domain/splitter-type.enum';
import { SplitterHandlerRegistry } from './application/splitter-handler.registry';
import { SplitTextUseCase } from './application/use-cases/split-text/split-text.use-case';

@Module({
  providers: [
    {
      provide: SplitterHandlerRegistry,
      useFactory: (recursiveSplitterHandler: RecursiveSplitterHandler) => {
        const registry = new SplitterHandlerRegistry();
        registry.registerHandler(
          SplitterType.RECURSIVE,
          recursiveSplitterHandler,
        );
        return registry;
      },
      inject: [RecursiveSplitterHandler],
    },
    SplitTextUseCase,
    RecursiveSplitterHandler,
  ],
  exports: [SplitTextUseCase],
})
export class SplitterModule {}
