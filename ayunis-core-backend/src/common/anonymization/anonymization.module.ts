import { Module } from '@nestjs/common';
import { AnonymizationPort } from './application/ports/anonymization.port';
import { PresidioAnonymizationProvider } from './infrastructure/providers/presidio-anonymization.provider';
import { AnonymizeTextUseCase } from './application/use-cases/anonymize-text/anonymize-text.use-case';

@Module({
  providers: [
    {
      provide: AnonymizationPort,
      useClass: PresidioAnonymizationProvider,
    },
    AnonymizeTextUseCase,
  ],
  exports: [AnonymizationPort, AnonymizeTextUseCase],
})
export class AnonymizationModule {}
