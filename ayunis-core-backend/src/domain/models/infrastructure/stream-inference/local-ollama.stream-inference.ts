import { Injectable } from '@nestjs/common';
import { BaseOllamaStreamInferenceHandler } from './base-ollama.stream-inference';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';

@Injectable()
export class LocalOllamaStreamInferenceHandler extends BaseOllamaStreamInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super();
    this.client = new Ollama({
      host: configService.get('models.ollama.baseURL'),
    });
    this.imageContentService = imageContentService;
  }
}
