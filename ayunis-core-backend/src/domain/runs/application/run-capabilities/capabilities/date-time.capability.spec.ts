import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  sectionsIn,
} from 'src/domain/runs/testing/run-capability.fixture';
import { DateTimeCapability } from './date-time.capability';

describe('DateTimeCapability', () => {
  const capability = new DateTimeCapability();

  it('frames the run with the date but not the time of day', () => {
    const contribution = capability.contribute(
      aCapabilityContext({ now: new Date('2026-01-15T10:23:45.678Z') }),
    );

    expect(sectionsIn(contribution, PromptSlot.FRAMING)).toEqual([
      '<context>\nCurrent date: 2026-01-15\n</context>',
    ]);
  });

  it('contributes the same section for different times on the same day', () => {
    const morning = capability.contribute(
      aCapabilityContext({ now: new Date('2026-01-15T08:00:00.000Z') }),
    );
    const evening = capability.contribute(
      aCapabilityContext({ now: new Date('2026-01-15T19:59:59.999Z') }),
    );

    expect(morning).toEqual(evening);
  });
});
