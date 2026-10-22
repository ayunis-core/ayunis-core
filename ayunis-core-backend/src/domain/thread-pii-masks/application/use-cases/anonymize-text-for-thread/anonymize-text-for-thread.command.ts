import type { DetectionMeasurementCaller } from 'src/common/anonymization/domain/detection-measurement-context';
import type { UUID } from 'crypto';

export class AnonymizeTextForThreadCommand {
  constructor(
    public readonly text: string,
    public readonly orgId: UUID,
    public readonly threadId: UUID,
    public readonly measurementCaller: DetectionMeasurementCaller = {
      source: 'user_message',
    },
  ) {}
}
