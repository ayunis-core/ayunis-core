import { Module } from '@nestjs/common';
import { TranscriptionsController } from './presenters/http/transcriptions.controller';
import { TranscribeUseCase } from './application/use-cases/transcribe/transcribe.use-case';
import { TranscriptionPort } from './application/ports/transcription.port';
import { MistralTranscriptionService } from './infrastructure/mistral-transcription.service';
import { ContextModule } from 'src/common/context/context.module';

@Module({
  imports: [ContextModule],
  controllers: [TranscriptionsController],
  providers: [
    TranscribeUseCase,
    {
      provide: TranscriptionPort,
      useClass: MistralTranscriptionService,
    },
  ],
  exports: [TranscriptionPort],
})
export class TranscriptionsModule {}
