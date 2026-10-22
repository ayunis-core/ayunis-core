import { ConfigModule } from '@nestjs/config';
import { anonymizationMeasurementConfig } from 'src/config/anonymization-measurement.config';
import { AnonymizationMeasurementService } from './infrastructure/providers/anonymization-measurement.service';
import { Module } from '@nestjs/common';
import { AnonymizationPort } from './application/ports/anonymization.port';
import { PresidioAnonymizationProvider } from './infrastructure/providers/presidio-anonymization.provider';
import { AnonymizeTextUseCase } from './application/use-cases/anonymize-text/anonymize-text.use-case';

@Module({
  imports: [ConfigModule.forFeature(anonymizationMeasurementConfig)],
  providers: [
    AnonymizationMeasurementService,
    {
      provide: AnonymizationPort,
      useClass: PresidioAnonymizationProvider,
    },
    AnonymizeTextUseCase,
  ],
  exports: [AnonymizationPort, AnonymizeTextUseCase],
})
export class AnonymizationModule {}
