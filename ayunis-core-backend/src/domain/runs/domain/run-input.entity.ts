import type { UUID } from 'crypto';
import { ToolCallDecision } from 'src/domain/messages/domain/value-objects/tool-call-decision.object';

/**
 * Domain-layer data structure for image uploads.
 * Contains the raw binary data and metadata needed for image storage.
 */
export interface ImageUploadData {
  readonly buffer: Buffer;
  readonly contentType: string;
  readonly altText?: string;
}

export class RunInput {}

export class RunUserInput extends RunInput {
  constructor(
    public readonly text: string,
    public readonly pendingImages: ImageUploadData[] = [],
    public readonly skillId?: UUID,
    private readonly onImagesReleased?: () => void,
  ) {
    super();
  }

  releaseImages(): void {
    this.pendingImages.length = 0;
    this.onImagesReleased?.();
  }
}

/** A nudge the system sends to an unattended run that replied with text. */
export class RunNudgeInput extends RunUserInput {
  constructor(text: string) {
    super(text);
  }
}

/** Answers the unanswered tool calls of the thread's last assistant turn. */
export abstract class RunToolContinuationInput extends RunInput {}

export class RunToolResultInput extends RunToolContinuationInput {
  constructor(
    public readonly toolId: string,
    public readonly toolName: string,
    public readonly result: string,
  ) {
    super();
  }
}

export interface RunToolCallDecision {
  readonly toolCallId: string;
  readonly approved: boolean;
  /** Only applies to an approved call. */
  readonly alwaysAllow: boolean;
}

/** The user's decisions on the calls awaiting their confirmation. */
export class RunToolDecisionsInput extends RunToolContinuationInput {
  constructor(public readonly decisions: readonly RunToolCallDecision[]) {
    super();
  }

  decisionFor(toolCallId: string): ToolCallDecision | undefined {
    const decision = this.decisions.find(
      (candidate) => candidate.toolCallId === toolCallId,
    );
    if (!decision) return undefined;
    return decision.approved
      ? ToolCallDecision.CONFIRMED
      : ToolCallDecision.REJECTED;
  }
}
