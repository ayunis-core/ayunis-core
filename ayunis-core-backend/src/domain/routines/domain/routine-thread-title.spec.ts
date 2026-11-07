import { routineThreadTitle } from './routine-thread-title';

describe('routineThreadTitle', () => {
  it('names the thread after the routine and the Berlin calendar date', () => {
    expect(
      routineThreadTitle(
        'Verkündungsplattform',
        new Date('2026-11-06T09:15:00.000Z'),
      ),
    ).toBe('Verkündungsplattform – 06.11.2026');
  });

  it('uses the Berlin date when UTC is still on the previous day', () => {
    expect(
      routineThreadTitle('Amtsblatt', new Date('2026-11-06T23:30:00.000Z')),
    ).toBe('Amtsblatt – 07.11.2026');
  });
});
