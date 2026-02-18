import { Injectable } from '@nestjs/common';
import { BaseOpenAIChatInferenceHandler } from './base-openai-chat.inference';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class StackitInferenceHandler extends BaseOpenAIChatInferenceHandler {
  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new OpenAI({
      apiKey: this.configService.get('models.stackit.apiKey'),
      baseURL: this.configService.get('models.stackit.baseURL'),
    });
  }
}
