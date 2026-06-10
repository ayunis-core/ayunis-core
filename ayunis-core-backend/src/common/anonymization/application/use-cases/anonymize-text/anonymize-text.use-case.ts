import { Injectable, Logger } from '@nestjs/common';
import {
  AnonymizationPort,
  AnonymizationResult,
} from '../../ports/anonymization.port';
import { AnonymizeTextCommand } from './anonymize-text.command';
import { filterWhitelistedDetections } from '../../../domain/whitelist-filter';
import { applyReplacements } from '../../../domain/apply-replacements';
import { PiiDetection } from '../../../domain/pii-detection';

@Injectable()
export class AnonymizeTextUseCase {
  private readonly logger = new Logger(AnonymizeTextUseCase.name);

  constructor(private readonly anonymizationPort: AnonymizationPort) {}

  async execute(command: AnonymizeTextCommand): Promise<AnonymizationResult> {
    this.logger.log('Executing anonymize text', {
      textLength: command.text.length,
      entities: command.entities,
      whitelistSize: command.whitelist?.length ?? 0,
    });

    const detections = await this.anonymizationPort.detect(
      command.text,
      command.entities,
    );
    const remaining = command.whitelist?.length
      ? filterWhitelistedDetections(detections, command.whitelist)
      : detections;

    return {
      originalText: command.text,
      anonymizedText: applyReplacements(command.text, remaining),
      replacements: remaining.map((detection) => this.toReplacement(detection)),
    };
  }

  private toReplacement(detection: PiiDetection) {
    return {
      entityType: detection.entityType,
      category: detection.category,
      originalValue: detection.text,
      start: detection.start,
      end: detection.end,
      score: detection.score,
    };
  }
}
