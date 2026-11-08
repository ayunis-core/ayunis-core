import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { reportUnexpectedError } from 'src/common/errors/report-unexpected-error.helper';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { SynthesizeSpeechCommand } from 'src/domain/speech/application/use-cases/synthesize-speech/synthesize-speech.command';
import { SynthesizeSpeechUseCase } from 'src/domain/speech/application/use-cases/synthesize-speech/synthesize-speech.use-case';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';
import { ApiSynthesizeSpeech } from './decorators/api-synthesize-speech.decorator';
import { SynthesizeSpeechDto } from './dto/synthesize-speech.dto';

@ApiTags('speech')
@ApiBearerAuth()
@RequireAcademyCertificate()
@RequireFeature(FeatureFlag.ReadAloud)
@Controller('speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);

  constructor(
    private readonly synthesizeSpeechUseCase: SynthesizeSpeechUseCase,
  ) {}

  @Post()
  @ApiSynthesizeSpeech()
  async synthesize(
    @Body() dto: SynthesizeSpeechDto,
    @Res() response: Response,
  ): Promise<void> {
    const listener = new AbortController();
    response.on('close', () => {
      if (!response.writableFinished) listener.abort();
    });

    // Awaited before the status is committed, so a request the provider
    // rejects still reaches the client as an error response.
    const audio = await this.synthesizeSpeechUseCase.execute(
      new SynthesizeSpeechCommand({
        text: dto.text,
        uiLanguage: dto.language ?? 'en',
        signal: listener.signal,
      }),
    );

    response.status(200);
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    try {
      await pipeline(Readable.from(audio), response);
    } catch (error) {
      if (listener.signal.aborted) return;
      // The 200 is already on the wire; breaking the connection off is the
      // only way left to tell the client the audio is incomplete.
      this.logger.error({ err: error as Error }, 'Speech stream broke off');
      reportUnexpectedError(error);
    }
  }
}
