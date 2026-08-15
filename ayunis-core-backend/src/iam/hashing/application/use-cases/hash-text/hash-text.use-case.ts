import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HashingHandler } from '../../ports/hashing.handler';
import { HashTextCommand } from './hash-text.command';
import { HashingFailedError, HashingError } from '../../hashing.errors';

@Injectable()
export class HashTextUseCase {
  constructor(
    @InjectPinoLogger(HashTextUseCase.name)
    private readonly logger: PinoLogger,
    private readonly hashingHandler: HashingHandler,
  ) {}

  async execute(command: HashTextCommand): Promise<string> {
    this.logger.info('hash');
    try {
      this.logger.debug('Hashing plaintext data');
      const hashedData = await this.hashingHandler.hash(command.plainText);
      this.logger.debug('Successfully hashed data');
      return hashedData;
    } catch (error) {
      if (!(error instanceof HashingError)) {
        this.logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to hash data',
        );
        throw new HashingFailedError(
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
      throw error;
    }
  }
}
