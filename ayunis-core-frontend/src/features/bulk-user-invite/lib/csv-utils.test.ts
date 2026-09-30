import { describe, expect, it } from 'vitest';
import { generateInviteTemplate, parseInviteCsv } from './csv-utils';

describe(parseInviteCsv.name, () => {
  it('parses multiple pipe-separated teams for one user', () => {
    const result = parseInviteCsv(
      'email,role,teams\nada@example.com,user,Research|Operations',
    );

    expect(result).toEqual({
      success: true,
      errors: [],
      data: [
        {
          email: 'ada@example.com',
          role: 'user',
          teamNames: ['Research', 'Operations'],
          rowNumber: 2,
          isValid: true,
          error: undefined,
        },
      ],
    });
  });

  it('keeps the teams column optional for existing import files', () => {
    const result = parseInviteCsv('email,role\nada@example.com,user');

    expect(result.success).toBe(true);
    expect(result.data[0]?.teamNames).toEqual([]);
  });

  it('deduplicates repeated team names in a row', () => {
    const result = parseInviteCsv(
      'email;role;teams\nada@example.com;user;Research | Research',
    );

    expect(result.data[0]?.teamNames).toEqual(['Research']);
  });

  it('supports escaped pipes and backslashes in team names', () => {
    const result = parseInviteCsv(
      String.raw`email,role,teams
ada@example.com,user,Research \| Operations|C:\\Users`,
    );

    expect(result.data[0]?.teamNames).toEqual([
      'Research | Operations',
      String.raw`C:\Users`,
    ]);
  });
});

describe(generateInviteTemplate.name, () => {
  it('documents the optional multi-team column', () => {
    expect(generateInviteTemplate()).toContain('email,role,teams');
    expect(generateInviteTemplate()).toContain('Research|Operations');
  });
});
