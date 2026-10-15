import { describe, expect, it } from 'vitest';
import type { HandoverRequest } from '@/features/resource-handover';
import { requestSections } from './request-sections';

function request(
  id: string,
  target: HandoverRequest['target'],
): HandoverRequest {
  return {
    id,
    resourceType: 'skill',
    resource: { id: `skill-${id}`, name: `Skill ${id}` },
    target,
    requestedBy: { userId: 'lena', name: 'Lena Hoffmann' },
    requestedAt: '2026-10-15T09:14:00.000Z',
    status: 'pending',
  };
}

describe('requestSections', () => {
  it('puts the organisation first, then teams by name, keeping request order', () => {
    const sections = requestSections([
      request('1', { type: 'team', teamId: 'b', teamName: 'Bürgerservice' }),
      request('2', { type: 'org' }),
      request('3', { type: 'team', teamId: 'a', teamName: 'Bauamt' }),
      request('4', { type: 'team', teamId: 'b', teamName: 'Bürgerservice' }),
    ]);

    expect(
      sections.map(({ teamName, requests }) => [
        teamName,
        requests.map(({ id }) => id),
      ]),
    ).toEqual([
      [null, ['2']],
      ['Bauamt', ['3']],
      ['Bürgerservice', ['1', '4']],
    ]);
  });

  it('returns a single section when every request has the same target', () => {
    expect(
      requestSections([
        request('1', { type: 'team', teamId: 'a', teamName: 'Bauamt' }),
        request('2', { type: 'team', teamId: 'a', teamName: 'Bauamt' }),
      ]),
    ).toHaveLength(1);
  });
});
