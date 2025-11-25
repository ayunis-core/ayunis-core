import { BaseOllamaInferenceHandler } from './base-ollama.inference';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { ImageContentService } from '../services/image-content.service';

@Injectable()
export class LocalOllamaInferenceHandler extends BaseOllamaInferenceHandler {
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
