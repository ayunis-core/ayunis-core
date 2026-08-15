import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TranscribeUseCase } from '../../application/use-cases/transcribe/transcribe.use-case';
import { TranscribeCommand } from '../../application/use-cases/transcribe/transcribe.command';
import { TranscriptionResponseDto } from './dtos/transcription-response.dto';
import { ApiTranscribe } from './decorators/api-transcribe.decorator';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';

@ApiTags('transcriptions')
@ApiBearerAuth()
@RequireAcademyCertificate()
@Controller('transcriptions')
export class TranscriptionsController {
  constructor(
    @InjectPinoLogger(TranscriptionsController.name)
    private readonly logger: PinoLogger,
    private readonly transcribeUseCase: TranscribeUseCase,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
    }),
  )
  @ApiTranscribe()
  async transcribe(
    // Multer leaves this undefined when the request carries no file, so the
    // guard clause has to come before the first dereference.
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('language') language?: string,
  ): Promise<TranscriptionResponseDto> {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }

    this.logger.info(
      {
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        language,
      },
      'Transcription request received',
    );

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
