import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HashingHandler } from '../../ports/hashing.handler';
import { CompareHashCommand } from './compare-hash.command';
import { ComparisonFailedError, HashingError } from '../../hashing.errors';

@Injectable()
export class CompareHashUseCase {
  constructor(
    @InjectPinoLogger(CompareHashUseCase.name)
    private readonly logger: PinoLogger,
    private readonly hashingHandler: HashingHandler,
  ) {}

  async execute(command: CompareHashCommand): Promise<boolean> {
    this.logger.info('compare');
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
