import { BaseOllamaInferenceHandler } from './base-ollama.inference';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';

@Injectable()
export class AyunisOllamaInferenceHandler extends BaseOllamaInferenceHandler {
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
