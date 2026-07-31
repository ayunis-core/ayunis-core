import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TranscriptionResponseDto } from '../dtos/transcription-response.dto';

/** API documentation for the audio transcription endpoint. */
export function ApiTranscribe() {
  return applyDecorators(
    ApiOperation({
      summary: 'Transcribe audio file to text',
      description:
        'Upload an audio file and receive the transcribed text. ' +
        'Supports webm, mp4, mp3, wav, and m4a formats.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'The audio file to transcribe',
          },
          language: {
            type: 'string',
            description: 'Optional language hint (e.g., "en", "de")',
            example: 'en',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Audio successfully transcribed',
      type: TranscriptionResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid request or unsupported audio format',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Transcription failed',
    }),
  );
}
