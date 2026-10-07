import { Injectable, Logger } from '@nestjs/common';
import {
  AnonymizationPort,
  AnonymizationResult,
} from 'src/common/anonymization/application/ports/anonymization.port';
import { AnonymizeTextCommand } from './anonymize-text.command';
import { filterWhitelistedDetections } from 'src/common/anonymization/domain/whitelist-filter';
import { applyReplacements } from 'src/common/anonymization/domain/apply-replacements';
import { applyMaskReplacements } from 'src/common/anonymization/domain/apply-mask-replacements';
import { PiiDetection } from 'src/common/anonymization/domain/pii-detection';
import { PiiMask } from 'src/common/anonymization/domain/pii-mask';
import {
  AnonymizationPostDetectionError,
  getAnonymizationCauseType,
  type AnonymizationPostDetectionStage,
} from 'src/common/anonymization/application/anonymization.errors';

@Injectable()
export class AnonymizeTextUseCase {
  private readonly logger = new Logger(AnonymizeTextUseCase.name);

  constructor(private readonly anonymizationPort: AnonymizationPort) {}

  async execute(command: AnonymizeTextCommand): Promise<AnonymizationResult> {
    this.logger.log(
      {
        textLength: command.text.length,
        entities: command.entities,
        whitelistSize: command.whitelist?.length ?? 0,
      },
      'Executing anonymize text',
    );

    const detections = await this.anonymizationPort.detect(
      command.text,
      command.entities,
    );
    const remaining = this.filterDetections(command, detections);

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

  private filterDetections(
    command: AnonymizeTextCommand,
    detections: PiiDetection[],
  ): PiiDetection[] {
    try {
      return command.whitelist?.length
        ? filterWhitelistedDetections(detections, command.whitelist)
        : detections;
    } catch (cause) {
      throw this.postDetectionError(
        'whitelist_filter',
        command.text.length,
        detections.length,
        cause,
      );
    }
  }

  private buildAnonymizedText(
    command: AnonymizeTextCommand,
    detections: PiiDetection[],
  ): { anonymizedText: string; newMasks: PiiMask[] } {
    try {
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
    } catch (cause) {
      throw this.postDetectionError(
        'mask_application',
        command.text.length,
        detections.length,
        cause,
      );
    }
  }

  private postDetectionError(
    stage: AnonymizationPostDetectionStage,
    textLength: number,
    detectionCount: number,
    cause: unknown,
  ): AnonymizationPostDetectionError {
    const error = new AnonymizationPostDetectionError(
      stage,
      textLength,
      detectionCount,
      getAnonymizationCauseType(cause),
    );
    this.logger.error(
      { errorCode: error.code, ...error.metadata },
      'Anonymization failed after detection',
    );
    return error;
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
