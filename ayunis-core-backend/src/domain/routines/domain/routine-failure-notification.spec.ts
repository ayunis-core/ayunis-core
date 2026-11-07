import { routineFailureNotification } from './routine-failure-notification';

const ROUTINES_URL = 'https://core.example.test/routines';

describe('routineFailureNotification', () => {
  it('names the routine and why its run failed', () => {
    const notification = routineFailureNotification({
      routineName: 'Verkündungsplattform',
      failureReason: 'timeout',
      paused: false,
      hasRoutineThread: true,
      routinesUrl: ROUTINES_URL,
    });

    expect(notification).toEqual({
      headline: 'Routine „Verkündungsplattform“ fehlgeschlagen',
      subheadline: 'Der Lauf dauerte zu lange und wurde abgebrochen.',
      body: expect.stringContaining(
        'Der Lauf der Routine „Verkündungsplattform“ ist fehlgeschlagen.',
      ),
    });
    expect(notification.body).toContain('Routine-Chat');
    expect(notification.body).not.toContain('pausiert');
  });

  it('says the routine is paused after three failures and how to resume it', () => {
    const notification = routineFailureNotification({
      routineName: 'Verkündungsplattform',
      failureReason: 'finish_routine_not_called',
      paused: true,
      hasRoutineThread: true,
      routinesUrl: ROUTINES_URL,
    });

    expect(notification.headline).toBe(
      'Routine „Verkündungsplattform“ pausiert',
    );
    expect(notification.body).toContain(
      'nach 3 fehlgeschlagenen Läufen in Folge pausiert',
    );
    expect(notification.body).toContain(`[Routinen](${ROUTINES_URL})`);
    expect(notification.body).toContain('wieder ein');
  });

  it('does not point to a routine chat when the run had none', () => {
    const notification = routineFailureNotification({
      routineName: 'Verkündungsplattform',
      failureReason: 'interrupted',
      paused: false,
      hasRoutineThread: false,
      routinesUrl: ROUTINES_URL,
    });

    expect(notification.subheadline).toBe('Der Lauf wurde unterbrochen.');
    expect(notification.body).not.toContain('Routine-Chat');
  });

  it.each([
    ['CREDIT_BUDGET_EXCEEDED', 'Das Credit-Limit wurde erreicht.'],
    ['MODEL_NOT_FOUND', 'Das Modell steht Ihnen nicht mehr zur Verfügung.'],
    ['SOMETHING_NEW', 'Etwas ist schiefgelaufen.'],
  ])('explains the failure reason %s', (failureReason, sentence) => {
    expect(
      routineFailureNotification({
        routineName: 'Amtsblatt',
        failureReason,
        paused: false,
        hasRoutineThread: false,
        routinesUrl: ROUTINES_URL,
      }).subheadline,
    ).toBe(sentence);
  });

  it('keeps markdown in the routine name from turning into links in the body', () => {
    const notification = routineFailureNotification({
      routineName: '[Klick](https://evil.example)',
      failureReason: 'timeout',
      paused: false,
      hasRoutineThread: false,
      routinesUrl: ROUTINES_URL,
    });

    expect(notification.body).toContain(
      '\\[Klick\\]\\(https://evil.example\\)',
    );
  });
});
