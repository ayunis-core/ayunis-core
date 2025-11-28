import { Injectable, Logger } from '@nestjs/common';
import {
  AnonymizationPort,
  AnonymizationResult,
} from '../../ports/anonymization.port';
import { AnonymizeTextCommand } from './anonymize-text.command';

@Injectable()
export class AnonymizeTextUseCase {
  private readonly logger = new Logger(AnonymizeTextUseCase.name);

  constructor(private readonly anonymizationPort: AnonymizationPort) {}

  async execute(command: AnonymizeTextCommand): Promise<AnonymizationResult> {
    this.logger.log('Executing anonymize text', {
      textLength: command.text.length,
      language: command.language,
      entities: command.entities,
    });

    return this.anonymizationPort.anonymize(
      command.text,
      command.language,
      command.entities,
    );
  }
}
