import { Injectable } from '@nestjs/common';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import { routineOf } from 'src/domain/runs/application/run-capabilities/routine-of.helper';
import { escapeXml } from 'src/domain/runs/application/services/xml-escape';

const ROUTINE_TIME_ZONE = 'Europe/Berlin';

/** The routine's name, and the current date and time where routines are scheduled. */
@Injectable()
export class RoutineContextCapability implements RunCapability {
  // The time of day goes into the run notes at the end of the prompt: every
  // nudge starts a new run with a new time, and only the prompt's end changes,
  // so providers that cache by prefix keep the rest.
  contribute(context: RunCapabilityContext): CapabilityContribution {
    const routine = routineOf(context);
    return {
      sections: [
        {
          slot: PromptSlot.FRAMING,
          content: `<routine>
Name: ${escapeXml(routine.name)}
The user's first message in this thread is the routine's task.
</routine>`,
        },
        {
          slot: PromptSlot.RUN_NOTES,
          content: `<context>
Current date and time: ${formatBerlinDateTime(context.now)} (${ROUTINE_TIME_ZONE})
</context>`,
        },
      ],
    };
  }
}

function formatBerlinDateTime(now: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ROUTINE_TIME_ZONE,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  ) as Record<Intl.DateTimeFormatPartTypes, string>;
  return `${parts.weekday}, ${parts.year}-${parts.month}-${parts.day}, ${parts.hour}:${parts.minute}`;
}
