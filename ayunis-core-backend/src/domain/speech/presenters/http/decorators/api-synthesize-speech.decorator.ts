import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import { SynthesizeSpeechDto } from 'src/domain/speech/presenters/http/dto/synthesize-speech.dto';

export function ApiSynthesizeSpeech() {
  return applyDecorators(
    ApiOperation({
      summary: 'Read text aloud',
      description:
        'Streams the text as MP3 speech while it is generated. The voice ' +
        'matches the detected language of the text, or the UI language ' +
        'when the text is too short or its language has no voice.',
    }),
    ApiBody({ type: SynthesizeSpeechDto }),
    ApiProduces('audio/mpeg'),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'MP3 audio, streamed while it is generated',
      content: {
        'audio/mpeg': { schema: { type: 'string', format: 'binary' } },
      },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Empty or too long text, or an unsupported UI language',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Read aloud is not enabled',
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Speech generation failed',
    }),
  );
}
