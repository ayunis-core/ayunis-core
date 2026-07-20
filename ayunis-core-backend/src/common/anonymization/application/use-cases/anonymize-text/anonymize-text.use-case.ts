import { Injectable, Logger } from '@nestjs/common';
import {
  AnonymizationPort,
  AnonymizationResult,
} from '../../ports/anonymization.port';
import { AnonymizeTextCommand } from './anonymize-text.command';
import { filterWhitelistedDetections } from 'src/common/anonymization/domain/whitelist-filter';
import { applyReplacements } from 'src/common/anonymization/domain/apply-replacements';
import { applyMaskReplacements } from 'src/common/anonymization/domain/apply-mask-replacements';
import { PiiDetection } from 'src/common/anonymization/domain/pii-detection';
import { PiiMask } from 'src/common/anonymization/domain/pii-mask';

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

    const { anonymizedText, newMasks } = this.buildAnonymizedText(
      command,
      remaining,
    );

    return {
      originalText: command.text,
      anonymizedText,
      replacements: remaining.map((detection) => this.toReplacement(detection)),
      newMasks,
    };
  }

  private buildAnonymizedText(
    command: AnonymizeTextCommand,
    detections: PiiDetection[],
  ): { anonymizedText: string; newMasks: PiiMask[] } {
    if (command.existingMasks !== undefined) {
      return applyMaskReplacements(
        command.text,
        detections,
        command.existingMasks,
      );
    }
    return {
      anonymizedText: applyReplacements(command.text, detections),
      newMasks: [],
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
