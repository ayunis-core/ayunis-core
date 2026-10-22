import { describe, expect, it } from 'vitest';
import { joinWithAnd } from './inviters';

describe('joinWithAnd', () => {
  it('joins German style', () => {
    expect(joinWithAnd(['Admins'], 'und')).toBe('Admins');
    expect(joinWithAnd(['Admins', 'Manager'], 'und')).toBe(
      'Admins und Manager',
    );
    expect(
      joinWithAnd(
        ['Admins', 'Manager', 'Team-Admins für ihr eigenes Team'],
        'und',
      ),
    ).toBe('Admins, Manager und Team-Admins für ihr eigenes Team');
  });
});
