import { Injectable, Logger } from '@nestjs/common';
import { HashingHandler } from '../../ports/hashing.handler';
import { HashTextCommand } from './hash-text.command';
import { HashingFailedError, HashingError } from '../../hashing.errors';

@Injectable()
export class HashTextUseCase {
  private readonly logger = new Logger(HashTextUseCase.name);

  constructor(private readonly hashingHandler: HashingHandler) {}

  async execute(command: HashTextCommand): Promise<string> {
    this.logger.log('hash');
    try {
      this.logger.debug('Hashing plaintext data');
      const hashedData = await this.hashingHandler.hash(command.plainText);
      this.logger.debug('Successfully hashed data');
      return hashedData;
    } catch (error) {
      if (!(error instanceof HashingError)) {
        this.logger.error('Failed to hash data', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new HashingFailedError(
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
      throw error;
    }
  }
}
