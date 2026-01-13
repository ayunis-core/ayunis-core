import { Module } from '@nestjs/common';
import { TokenCounterRegistry } from './application/token-counter.registry';
import { CountTokensUseCase } from './application/use-cases/count-tokens/count-tokens.use-case';
import { TiktokenHandler } from './infrastructure/handlers/tiktoken.handler';
import { SimpleHandler } from './infrastructure/handlers/simple.handler';

@Module({
  providers: [
    {
      provide: TokenCounterRegistry,
      useFactory: (
        tiktokenHandler: TiktokenHandler,
        simpleHandler: SimpleHandler,
      ) => {
        const registry = new TokenCounterRegistry();
        registry.registerHandler(tiktokenHandler);
        registry.registerHandler(simpleHandler);
        return registry;
      },
      inject: [TiktokenHandler, SimpleHandler],
    },
    CountTokensUseCase,
    TiktokenHandler,
    SimpleHandler,
  ],
  exports: [TokenCounterRegistry, CountTokensUseCase],
})
export class TokenCounterModule {}
