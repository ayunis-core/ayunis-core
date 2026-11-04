import { ConfigModule } from '@nestjs/config';
import transcriptionConfig from 'src/config/transcription.config';
import { AudioSegmenterPort } from './application/ports/audio-segmenter.port';
import { FfmpegAudioSegmenterAdapter } from './infrastructure/ffmpeg-audio-segmenter.adapter';
import { TranscribeRecordingUseCase } from './application/use-cases/transcribe-recording/transcribe-recording.use-case';
import { Module } from '@nestjs/common';
import { TranscriptionsController } from './presenters/http/transcriptions.controller';
import { TranscribeUseCase } from './application/use-cases/transcribe/transcribe.use-case';
import { TranscriptionPort } from './application/ports/transcription.port';
import { MistralTranscriptionService } from './infrastructure/mistral-transcription.service';
import { ContextModule } from 'src/common/context/context.module';

@Module({
  imports: [ContextModule, ConfigModule.forFeature(transcriptionConfig)],
  controllers: [TranscriptionsController],
  providers: [
    TranscribeUseCase,
    TranscribeRecordingUseCase,
    { provide: AudioSegmenterPort, useClass: FfmpegAudioSegmenterAdapter },
    {
      provide: TranscriptionPort,
      useClass: MistralTranscriptionService,
    },
  ],
  exports: [TranscriptionPort, TranscribeUseCase, TranscribeRecordingUseCase],
})
export class TranscriptionsModule {}
