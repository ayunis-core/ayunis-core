import { Module } from '@nestjs/common';
import { ContextModule } from 'src/common/context/context.module';
import { SpeechPort } from './application/ports/speech.port';
import { SpeechLanguageDetectorService } from './application/services/speech-language-detector.service';
import { SynthesizeSpeechUseCase } from './application/use-cases/synthesize-speech/synthesize-speech.use-case';
import { MistralSpeechService } from './infrastructure/mistral-speech.service';
import { SpeechController } from './presenters/http/speech.controller';

@Module({
  imports: [ContextModule],
  controllers: [SpeechController],
  providers: [
    SynthesizeSpeechUseCase,
    SpeechLanguageDetectorService,
    { provide: SpeechPort, useClass: MistralSpeechService },
  ],
})
export class SpeechModule {}
