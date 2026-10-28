import { describe, expect, it } from 'vitest';

import { parseSkillMarkdown } from './skill-markdown';

describe('parseSkillMarkdown', () => {
  it.each(['\n', '\r\n'] as const)(
    'parses Agent Skills frontmatter and instructions with %j lines',
    (newline) => {
      const markdown = [
        '---',
        'name: incident-response',
        'description: Coordinate incident response',
        'allowed-tools: [page_lead, inspect_logs]',
        '---',
        '# Response',
        '',
        'Page the incident lead.',
      ].join(newline);

      expect(parseSkillMarkdown(markdown, 'incident-response')).toEqual({
        name: 'incident-response',
        description: 'Coordinate incident response',
        instructions: '# Response\n\nPage the incident lead.',
        allowedToolNames: ['page_lead', 'inspect_logs'],
      });
    },
  );

  it.each([
    ['missing frontmatter', 'Instructions only', /requires YAML frontmatter/i],
    [
      'invalid name',
      '---\nname: Invalid\ndescription: Valid\n---\nInstructions',
      /name format/i,
    ],
    [
      'long description',
      `---\nname: valid\ndescription: ${'x'.repeat(1025)}\n---\nInstructions`,
      /at most 1024/i,
    ],
    [
      'empty instructions',
      '---\nname: valid\ndescription: Valid\n---\n',
      /instructions must not be empty/i,
    ],
  ])('rejects %s', (_name, markdown, expected) => {
    expect(() => parseSkillMarkdown(markdown, 'valid')).toThrow(expected);
  });
});
