import { Module } from '@nestjs/common';
import { BcryptHandler } from './infrastructure/handlers/bcrypt.handler';

// Import use cases
import { HashTextUseCase } from './application/use-cases/hash-text/hash-text.use-case';
import { CompareHashUseCase } from './application/use-cases/compare-hash/compare-hash.use-case';
import { HashingHandler } from './application/ports/hashing.handler';

@Module({
  providers: [
    {
      provide: HashingHandler,
      useClass: BcryptHandler,
    },
    // Use cases
    HashTextUseCase,
    CompareHashUseCase,
  ],
  exports: [
    HashTextUseCase,
    CompareHashUseCase,
    HashingHandler, // Export handler for seeding
  ],
})
export class HashingModule {}
