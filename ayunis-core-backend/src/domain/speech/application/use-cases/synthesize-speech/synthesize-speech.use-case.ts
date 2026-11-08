import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SpeechPort } from 'src/domain/speech/application/ports/speech.port';
import { SpeechLanguageDetectorService } from 'src/domain/speech/application/services/speech-language-detector.service';
import { UnexpectedSpeechError } from 'src/domain/speech/application/speech.errors';
import { SynthesizeSpeechCommand } from './synthesize-speech.command';

@Injectable()
export class SynthesizeSpeechUseCase {
  private readonly logger = new Logger(SynthesizeSpeechUseCase.name);

  constructor(
    private readonly speechPort: SpeechPort,
    private readonly languageDetector: SpeechLanguageDetectorService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSpeechError)
  async execute(
    command: SynthesizeSpeechCommand,
  ): Promise<AsyncIterable<Buffer>> {
    const { userId } = getRequiredUserContext(this.contextService);
    const language = this.languageDetector.detect(
      command.text,
      command.uiLanguage,
    );

    this.logger.log(
      {
        userId,
        language,
        uiLanguage: command.uiLanguage,
        textLength: command.text.length,
      },
      'Synthesizing speech',
    );

    return this.speechPort.synthesize({
      text: command.text,
      language,
      signal: command.signal,
    });
  }
}
