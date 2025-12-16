import { Injectable } from '@nestjs/common';
import { BaseOpenAIChatStreamInferenceHandler } from './base-openai-chat.stream-inference';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';

@Injectable()
export class AzureStreamInferenceHandler extends BaseOpenAIChatStreamInferenceHandler {
  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new AzureOpenAI({
      apiKey: this.configService.get('models.azure.apiKey'),
      endpoint: this.configService.get('models.azure.endpoint'),
      apiVersion: this.configService.get('models.azure.apiVersion'),
    });
  }
}
