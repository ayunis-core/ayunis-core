import { Injectable } from '@nestjs/common';
import { BaseOpenAIChatStreamInferenceHandler } from './base-openai-chat.stream-inference';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { Observable } from 'rxjs';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import {
  StreamInferenceInput,
  StreamInferenceResponseChunk,
} from '../../application/ports/stream-inference.handler';

@Injectable()
export class AzureStreamInferenceHandler extends BaseOpenAIChatStreamInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
  }

  private getClient(): AzureOpenAI {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- client is lazily initialized; base class types it as non-null
    if (!this.client) {
      this.client = new AzureOpenAI({
        apiKey: this.configService.get('models.azure.apiKey'),
        endpoint: this.configService.get('models.azure.endpoint'),
        apiVersion: this.configService.get('models.azure.apiVersion'),
      });
    }
    return this.client as AzureOpenAI;
  }

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    // Ensure client is initialized before calling parent
    this.getClient();
    return super.answer(input);
  }
}
