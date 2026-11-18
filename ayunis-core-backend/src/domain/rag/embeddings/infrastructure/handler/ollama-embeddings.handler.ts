import { ConfigService } from '@nestjs/config';
import { BaseOllamaEmbeddingsHandler } from './base-ollama-embeddings.handler';
import { Ollama } from 'ollama';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OllamaEmbeddingsHandler extends BaseOllamaEmbeddingsHandler {
  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Ollama({
      host: configService.get('embeddings.ollama.baseURL'),
    });
  }

  isAvailable(): boolean {
    return !!this.configService.get('embeddings.ollama.baseURL');
  }
}
