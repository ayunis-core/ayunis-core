import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Tiktoken, get_encoding } from 'tiktoken';
import {
  TokenCounterHandler,
  TokenCounterType,
} from '../../application/ports/token-counter.handler.port';

@Injectable()
export class TiktokenHandler
  extends TokenCounterHandler
  implements OnModuleDestroy
{
  private readonly logger = new Logger(TiktokenHandler.name);
  readonly type = TokenCounterType.TIKTOKEN;
  private encoder: Tiktoken | null = null;

  isAvailable(): boolean {
    return true;
  }

  countTokens(text: string): number {
    const encoder = this.getEncoder();
    const tokens = encoder.encode(text);
    return tokens.length;
  }

  private getEncoder(): Tiktoken {
    if (!this.encoder) {
      this.logger.debug('initializing tiktoken encoder (cl100k_base)');
      this.encoder = get_encoding('cl100k_base');
    }
    return this.encoder;
  }

  onModuleDestroy() {
    if (this.encoder) {
      this.encoder.free();
      this.encoder = null;
    }
  }
}
