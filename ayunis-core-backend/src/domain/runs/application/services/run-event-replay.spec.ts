import { RunEventReplay } from './run-event-replay';

describe('RunEventReplay integration warnings', () => {
  it('retains integration warnings for a reconnecting listener without ending the run', () => {
    const replay = new RunEventReplay();
    replay.record({
      type: 'session',
      threadId: 'thread',
      streaming: true,
      timestamp: 'start',
    });
    replay.record({
      type: 'integration_warning',
      threadId: 'thread',
      integrationId: 'integration',
      integrationName: 'Fynn',
      timestamp: 'warning',
    });
    replay.record({
      type: 'session',
      threadId: 'thread',
      streaming: false,
      timestamp: 'end',
    });
    expect(replay.events().map((event) => event.type)).toEqual([
      'session',
      'integration_warning',
      'session',
    ]);
  });
});
