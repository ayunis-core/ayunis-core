import { Injectable, Logger } from '@nestjs/common';
import { HashingHandler } from 'src/iam/hashing/application/ports/hashing.handler';
import { CompareHashCommand } from './compare-hash.command';
import {
  ComparisonFailedError,
  HashingError,
} from 'src/iam/hashing/application/hashing.errors';

@Injectable()
export class CompareHashUseCase {
  private readonly logger = new Logger(CompareHashUseCase.name);

  constructor(private readonly hashingHandler: HashingHandler) {}

  async execute(command: CompareHashCommand): Promise<boolean> {
    this.logger.log('compare');
    try {
      this.logger.debug('Comparing plaintext with hash');
      const isMatch = await this.hashingHandler.compare(
        command.plainText,
        command.hash,
      );
      this.logger.debug({ isMatch }, 'Comparison completed');
      return isMatch;
    } catch (error) {
      if (!(error instanceof HashingError)) {
        this.logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to compare hash',
        );
        throw new ComparisonFailedError(
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
      throw error;
    }
  }
}
