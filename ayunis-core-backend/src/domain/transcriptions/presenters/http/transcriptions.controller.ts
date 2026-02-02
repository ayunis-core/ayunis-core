import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TranscribeUseCase } from '../../application/use-cases/transcribe/transcribe.use-case';
import { TranscribeCommand } from '../../application/use-cases/transcribe/transcribe.command';
import { TranscriptionResponseDto } from './dtos/transcription-response.dto';

@ApiTags('transcriptions')
@ApiBearerAuth()
@Controller('transcriptions')
export class TranscriptionsController {
  private readonly logger = new Logger(TranscriptionsController.name);

  constructor(private readonly transcribeUseCase: TranscribeUseCase) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Transcribe audio file to text',
    description:
      'Upload an audio file and receive the transcribed text. ' +
      'Supports webm, mp4, mp3, wav, and m4a formats.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
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
  })
  @ApiResponse({
    status: 200,
    description: 'Audio successfully transcribed',
    type: TranscriptionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or unsupported audio format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 500,
    description: 'Transcription failed',
  })
  async transcribe(
    @UploadedFile() file: Express.Multer.File,
    @Body('language') language?: string,
  ): Promise<TranscriptionResponseDto> {
    this.logger.log('Transcription request received', {
      fileName: file?.originalname,
      mimeType: file?.mimetype,
      fileSize: file?.size,
      language,
    });

    if (!file) {
      throw new BadRequestException('No audio file provided');
    }

    const command = new TranscribeCommand({
      file: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      language,
    });

    const transcriptedText = await this.transcribeUseCase.execute(command);

    return new TranscriptionResponseDto(transcriptedText);
  }
}
