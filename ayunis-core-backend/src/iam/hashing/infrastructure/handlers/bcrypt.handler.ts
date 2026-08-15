import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { HashingHandler } from '../../application/ports/hashing.handler';
import {
  HashingFailedError,
  ComparisonFailedError,
  InvalidHashFormatError,
} from '../../application/hashing.errors';

@Injectable()
export class BcryptHandler implements HashingHandler {
  private readonly saltRounds: number;

  constructor(
    @InjectPinoLogger(BcryptHandler.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    this.saltRounds = this.configService.get<number>(
      'auth.local.passwordHashRounds',
      10,
    );
    this.logger.info({ saltRounds: this.saltRounds }, 'constructor');
  }

  async hash(plainText: string): Promise<string> {
    this.logger.info('hash');

    if (!plainText) {
      this.logger.warn('Attempted to hash empty string');
      throw new InvalidHashFormatError('Cannot hash empty string');
    }

    try {
      this.logger.debug(
        {
          saltRounds: this.saltRounds,
        },
        'Hashing using bcrypt',
      );
      return await bcrypt.hash(plainText, this.saltRounds);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Bcrypt hashing failed',
      );
      throw new HashingFailedError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    this.logger.info('compare');

    if (!hash) {
      this.logger.warn('Attempted to compare with empty hash');
      throw new InvalidHashFormatError('Cannot compare with empty hash');
    }

    try {
      this.logger.debug('Comparing using bcrypt');
      return await bcrypt.compare(plainText, hash);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Bcrypt comparison failed',
      );
      throw new ComparisonFailedError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
