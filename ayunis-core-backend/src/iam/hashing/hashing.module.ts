import { Module } from '@nestjs/common';
import { HASHING_HANDLER } from './application/tokens/hashing-handler.token';
import { BcryptHandler } from './infrastructure/handlers/bcrypt.handler';

// Import use cases
import { HashTextUseCase } from './application/use-cases/hash-text/hash-text.use-case';
import { CompareHashUseCase } from './application/use-cases/compare-hash/compare-hash.use-case';

@Module({
  providers: [
    {
      provide: HASHING_HANDLER,
      useClass: BcryptHandler,
    },
    // Use cases
    HashTextUseCase,
    CompareHashUseCase,
  ],
  exports: [HashTextUseCase, CompareHashUseCase],
})
export class HashingModule {}
