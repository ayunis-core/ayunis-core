import { Org } from './org.entity';

describe('Org lifecycle defaults', () => {
  it('creates an active organisation without a prior session generation', () => {
    const org = new Org({ name: 'Stadt Musterhausen' });
    expect(org).toMatchObject({ archived: false, sessionVersion: 0 });
  });
});
