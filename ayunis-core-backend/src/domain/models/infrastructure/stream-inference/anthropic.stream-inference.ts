import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { BaseAnthropicStreamInferenceHandler } from './base-anthropic.stream-inference';

@Injectable()
export class AnthropicStreamInferenceHandler extends BaseAnthropicStreamInferenceHandler {
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
