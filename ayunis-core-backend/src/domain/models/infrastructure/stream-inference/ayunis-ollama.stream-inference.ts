import { Injectable } from '@nestjs/common';
import { BaseOllamaStreamInferenceHandler } from './base-ollama.stream-inference';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';

@Injectable()
export class AyunisOllamaStreamInferenceHandler extends BaseOllamaStreamInferenceHandler {
  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Ollama({
      host: configService.get('models.ayunis.baseURL'),
      headers: {
        Authorization: `Bearer ${configService.get('models.ayunis.authToken')}`,
      },
    });
  }
}
