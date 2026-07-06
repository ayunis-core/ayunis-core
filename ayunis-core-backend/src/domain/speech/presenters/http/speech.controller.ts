import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SynthesizeSpeechUseCase } from '../../application/use-cases/synthesize-speech/synthesize-speech.use-case';
import { SynthesizeSpeechCommand } from '../../application/use-cases/synthesize-speech/synthesize-speech.command';
import { SynthesizeSpeechDto } from './dtos/synthesize-speech.dto';
import { RateLimit } from 'src/iam/authorization/application/decorators/rate-limit.decorator';

@ApiTags('speech')
@ApiBearerAuth()
@Controller('speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);

  constructor(
    private readonly synthesizeSpeechUseCase: SynthesizeSpeechUseCase,
  ) {}

  @Post()
  @HttpCode(200)
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @ApiOperation({
    summary: 'Synthesize speech from text',
    description:
      'Convert text to spoken audio using the configured text-to-speech model. ' +
      'Returns the generated audio as an MP3 stream.',
  })
  @ApiResponse({
    status: 200,
    description: 'The synthesized speech audio',
    content: {
      'audio/mpeg': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or too long input text',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Speech synthesis failed' })
  async synthesize(
    @Body() dto: SynthesizeSpeechDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log('Speech synthesis request received', {
      inputLength: dto.input.length,
    });

    const audio = await this.synthesizeSpeechUseCase.execute(
      new SynthesizeSpeechCommand({ input: dto.input }),
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="speech.mp3"',
    });

    return new StreamableFile(audio);
  }
}
