import { Injectable } from '@nestjs/common';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

const ANONYMIZED_DATA = `<anonymized_data>
This conversation runs in anonymous mode: personally identifiable information in user messages and tool results has been replaced with placeholder tokens of the form {{pii:CATEGORY_NUMBER}} before reaching you (e.g. {{pii:PERSON_NAME_1}}, {{pii:EMAIL_ADDRESS_2}}).

Rules for handling these placeholders:

- Each placeholder consistently refers to the same real entity throughout the conversation.
- When referring to such an entity, copy its placeholder verbatim — exact braces, spelling, and number (e.g. {{pii:PERSON_NAME_1}}).
- Never invent new placeholders, alter existing ones, or guess the hidden values.
- Do not mention this anonymization mechanism unless the user asks about it.
</anonymized_data>`;

@Injectable()
export class AnonymizationCapability implements RunCapability {
  contribute(context: RunCapabilityContext): CapabilityContribution {
    if (!context.isAnonymous) return {};
    return {
      sections: [{ slot: PromptSlot.POLICIES, content: ANONYMIZED_DATA }],
    };
  }
}
