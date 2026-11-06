import { Injectable } from '@nestjs/common';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

@Injectable()
export class DateTimeCapability implements RunCapability {
  // Date only, no time of day: this section sits at the top of the system
  // prompt, and prompt caching is a byte-exact prefix match — a timestamp
  // here would invalidate the provider cache on every request.
  contribute(context: RunCapabilityContext): CapabilityContribution {
    return {
      sections: [
        {
          slot: PromptSlot.FRAMING,
          content: `<context>
Current date: ${context.now.toISOString().slice(0, 10)}
</context>`,
        },
      ],
    };
  }
}
