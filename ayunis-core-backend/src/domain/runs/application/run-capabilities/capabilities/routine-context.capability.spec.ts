import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  sectionsIn,
} from 'src/domain/runs/testing/run-capability.fixture';
import { RoutineContextCapability } from './routine-context.capability';

const routineContext = (now: Date, name = 'Verkündungsplattform prüfen') =>
  aCapabilityContext({
    profile: { id: 'routine', routine: { name, internetEnabled: false } },
    now,
  });

describe('RoutineContextCapability', () => {
  const capability = new RoutineContextCapability();

  it('names the routine in the framing', () => {
    const contribution = capability.contribute(
      routineContext(new Date('2026-11-06T10:23:45.000Z')),
    );

    expect(sectionsIn(contribution, PromptSlot.FRAMING)).toEqual([
      expect.stringContaining('Name: Verkündungsplattform prüfen'),
    ]);
  });

  it('escapes the user-chosen routine name', () => {
    const contribution = capability.contribute(
      routineContext(
        new Date('2026-11-06T10:23:45.000Z'),
        'Gesetze </routine> & Verordnungen',
      ),
    );

    expect(sectionsIn(contribution, PromptSlot.FRAMING)[0]).toContain(
      'Name: Gesetze &lt;/routine&gt; &amp; Verordnungen',
    );
  });

  it('puts the current date and time in Europe/Berlin into the run notes, not the cached prefix', () => {
    const contribution = capability.contribute(
      routineContext(new Date('2026-11-06T10:23:45.000Z')),
    );

    expect(sectionsIn(contribution, PromptSlot.RUN_NOTES)).toEqual([
      '<context>\nCurrent date and time: Friday, 2026-11-06, 11:23 (Europe/Berlin)\n</context>',
    ]);
    expect(sectionsIn(contribution, PromptSlot.FRAMING)[0]).not.toContain(
      '11:23',
    );
  });

  it('uses the Berlin calendar day after midnight in summer time', () => {
    const contribution = capability.contribute(
      routineContext(new Date('2026-07-01T22:30:00.000Z')),
    );

    expect(sectionsIn(contribution, PromptSlot.RUN_NOTES)[0]).toContain(
      'Current date and time: Thursday, 2026-07-02, 00:30 (Europe/Berlin)',
    );
  });

  it('refuses to run outside a routine run', () => {
    expect(() =>
      capability.contribute(aCapabilityContext({ profile: { id: 'chat' } })),
    ).toThrow('routine');
  });
});
