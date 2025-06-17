import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HashingHandler } from '../../application/ports/hashing.handler';
import {
  HashingFailedError,
  ComparisonFailedError,
  InvalidHashFormatError,
} from '../../application/hashing.errors';

@Injectable()
export class BcryptHandler implements HashingHandler {
  private readonly logger = new Logger(BcryptHandler.name);
  private readonly saltRounds = 10;

  constructor() {
    this.logger.log('constructor');
  }

  async hash(plainText: string): Promise<string> {
    this.logger.log('hash');

    if (!plainText) {
      this.logger.warn('Attempted to hash empty string');
      throw new InvalidHashFormatError('Cannot hash empty string');
    }

    try {
      this.logger.debug('Hashing using bcrypt', {
        saltRounds: this.saltRounds,
      });
      return await bcrypt.hash(plainText, this.saltRounds);
    } catch (error) {
      this.logger.error('Bcrypt hashing failed', { error });
      throw new HashingFailedError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    this.logger.log('compare');

    if (!hash) {
      this.logger.warn('Attempted to compare with empty hash');
      throw new InvalidHashFormatError('Cannot compare with empty hash');
    }

    try {
      this.logger.debug('Comparing using bcrypt');
      return await bcrypt.compare(plainText, hash);
    } catch (error) {
      this.logger.error('Bcrypt comparison failed', { error });
      throw new ComparisonFailedError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
