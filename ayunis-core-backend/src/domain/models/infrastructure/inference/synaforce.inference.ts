import { Injectable } from '@nestjs/common';
import { BaseOllamaInferenceHandler } from './base-ollama.inference';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';

@Injectable()
export class SynaforceInferenceHandler extends BaseOllamaInferenceHandler {
  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Ollama({
      host: configService.get('models.synaforce.baseURL'),
    });
  }
}
