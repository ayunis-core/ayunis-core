import { describe, expect, it } from 'vitest';
import { resolveDiagramPlaceholders } from './resolve-diagram-placeholders';

describe('resolveDiagramPlaceholders', () => {
  it('writes a value with quotes or brackets as entity codes, so it cannot end the label it stands in', () => {
    expect(
      resolveDiagramPlaceholders('flowchart TD\n  A["{{pii:PERSON_NAME_1}}"]', [
        {
          token: '{{pii:PERSON_NAME_1}}',
          value: 'Max "Maxi" Müller-Lüdenscheidt (Bürgerbüro)',
          category: 'person_name',
        },
      ]),
    ).toBe(
      'flowchart TD\n  A["Max #34;Maxi#34; Müller-Lüdenscheidt #40;Bürgerbüro#41;"]',
    );
  });
});
