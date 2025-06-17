import { Module } from '@nestjs/common';
import { SplitterController } from './presenters/https/splitter.controller';
import { RecursiveSplitterHandler } from './infrastructure/recursive.splitter';
import { LineSplitterHandler } from './infrastructure/line.splitter';
import { SplitterProvider } from './domain/splitter-provider.enum';
import { SplitterProviderRegistry } from './application/splitter-provider.registry';
import { SplitResultMapper } from './presenters/https/mappers/split-result.mapper';
import { ProcessTextUseCase } from './application/use-cases/process-text/process-text.use-case';
import { GetAvailableProvidersUseCase } from './application/use-cases/get-available-providers/get-available-providers.use-case';

@Module({
  controllers: [SplitterController],
  providers: [
    {
      provide: SplitterProviderRegistry,
      useFactory: (
        recursiveSplitterHandler: RecursiveSplitterHandler,
        lineSplitterHandler: LineSplitterHandler,
      ) => {
        const registry = new SplitterProviderRegistry();
        registry.registerHandler(
          SplitterProvider.RECURSIVE,
          recursiveSplitterHandler,
        );
        registry.registerHandler(SplitterProvider.LINE, lineSplitterHandler);
        return registry;
      },
      inject: [RecursiveSplitterHandler, LineSplitterHandler],
    },
    ProcessTextUseCase,
    GetAvailableProvidersUseCase,
    RecursiveSplitterHandler,
    LineSplitterHandler,
    SplitResultMapper,
  ],
  exports: [ProcessTextUseCase, GetAvailableProvidersUseCase],
})
export class SplitterModule {}
