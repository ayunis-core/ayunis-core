import { Inject, Injectable, Logger } from '@nestjs/common';
import { HashingHandler } from '../../ports/hashing.handler';
import { HASHING_HANDLER } from '../../tokens/hashing-handler.token';
import { CompareHashCommand } from './compare-hash.command';
import { ComparisonFailedError, HashingError } from '../../hashing.errors';

@Injectable()
export class CompareHashUseCase {
  private readonly logger = new Logger(CompareHashUseCase.name);

  constructor(
    @Inject(HASHING_HANDLER)
    private readonly hashingHandler: HashingHandler,
  ) {}

  async execute(command: CompareHashCommand): Promise<boolean> {
    this.logger.log('compare');
    try {
      this.logger.debug('Comparing plaintext with hash');
      const isMatch = await this.hashingHandler.compare(
        command.plainText,
        command.hash,
      );
      this.logger.debug('Comparison completed', { isMatch });
      return isMatch;
    } catch (error) {
      if (!(error instanceof HashingError)) {
        this.logger.error('Failed to compare hash', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new ComparisonFailedError(
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
      throw error;
    }
  }
}
