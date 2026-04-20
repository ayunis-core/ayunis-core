import { Injectable } from '@nestjs/common';
import { BaseOpenAIChatInferenceHandler } from './base-openai-chat.inference';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import {
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';

@Injectable()
export class AzureInferenceHandler extends BaseOpenAIChatInferenceHandler {
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

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    // Ensure client is initialized before calling parent
    this.getClient();
    return super.answer(input);
  }
}
