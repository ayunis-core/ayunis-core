import { Injectable } from '@nestjs/common';
import { BaseOpenAIChatStreamInferenceHandler } from './base-openai-chat.stream-inference';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class ScalewayStreamInferenceHandler extends BaseOpenAIChatStreamInferenceHandler {
  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new OpenAI({
      apiKey: this.configService.get('models.scaleway.apiKey'),
      baseURL: this.configService.get('models.scaleway.baseURL'),
    });
  }
}
