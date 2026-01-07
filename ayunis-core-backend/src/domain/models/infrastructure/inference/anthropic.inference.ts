import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { BaseAnthropicInferenceHandler } from './base-anthropic.inference';

@Injectable()
export class AnthropicInferenceHandler extends BaseAnthropicInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
    this.client = new Anthropic({
      apiKey: this.configService.get('anthropic.apiKey'),
    });
  }
}
