import { Module } from '@nestjs/common';
import { SpeechController } from './presenters/http/speech.controller';
import { SynthesizeSpeechUseCase } from './application/use-cases/synthesize-speech/synthesize-speech.use-case';
import { TextToSpeechPort } from './application/ports/text-to-speech.port';
import { MistralTextToSpeechService } from './infrastructure/mistral-text-to-speech.service';
import { ContextModule } from 'src/common/context/context.module';

@Module({
  imports: [ContextModule],
  controllers: [SpeechController],
  providers: [
    SynthesizeSpeechUseCase,
    {
      provide: TextToSpeechPort,
      useClass: MistralTextToSpeechService,
    },
  ],
  exports: [TextToSpeechPort, SynthesizeSpeechUseCase],
})
export class SpeechModule {}
