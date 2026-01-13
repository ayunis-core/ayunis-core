import { Injectable } from '@nestjs/common';
import {
  TokenCounterHandler,
  TokenCounterType,
} from '../../application/ports/token-counter.handler.port';

@Injectable()
export class SimpleHandler extends TokenCounterHandler {
  readonly type = TokenCounterType.SIMPLE;

  isAvailable(): boolean {
    return true;
  }

  countTokens(text: string): number {
    // Rough estimation: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }
}
