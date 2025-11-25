import { Injectable } from '@nestjs/common';
import { BaseOllamaStreamInferenceHandler } from './base-ollama.stream-inference';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { ImageContentService } from '../services/image-content.service';

@Injectable()
export class AyunisOllamaStreamInferenceHandler extends BaseOllamaStreamInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super();
    this.client = new Ollama({
      host: configService.get('models.ayunis.baseURL'),
      headers: {
        Authorization: `Bearer ${configService.get('models.ayunis.authToken')}`,
      },
    });
    this.imageContentService = imageContentService;
  }
}
