import { markToolAsRecentlyActivated } from './mark-tool-as-recently-activated.helper';

describe('markToolAsRecentlyActivated', () => {
  it('moves an existing tool to the most recent position', () => {
    const activatedToolNames = new Set(['first', 'second', 'third']);

    markToolAsRecentlyActivated(activatedToolNames, 'first');

    expect([...activatedToolNames]).toEqual(['second', 'third', 'first']);
  });

  it('adds a newly activated tool as the most recent', () => {
    const activatedToolNames = new Set(['first']);

    markToolAsRecentlyActivated(activatedToolNames, 'second');

    expect([...activatedToolNames]).toEqual(['first', 'second']);
  });
});
