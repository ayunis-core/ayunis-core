import { Injectable } from '@nestjs/common';
import { BaseOpenAIChatStreamInferenceHandler } from './base-openai-chat.stream-inference';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';

@Injectable()
export class OtcStreamInferenceHandler extends BaseOpenAIChatStreamInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
    this.client = new OpenAI({
      apiKey: this.configService.get('models.otc.apiKey'),
      baseURL: this.configService.get('models.otc.baseURL'),
    });
  }
}
