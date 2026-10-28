import type { JsonSchema } from '@ayunis/agent-runtime';

import type { SkillSummary } from './skill-source';

export interface AvailableSkills {
  readonly names: readonly string[];
  readonly instructions: string;
  readonly activationSchema: JsonSchema;
}

export const buildAvailableSkills = (
  summaries: readonly SkillSummary[],
): AvailableSkills => {
  const sorted = [...summaries].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  validateSummaries(sorted);
  const names = sorted.map(({ name }) => name);

  return {
    names,
    instructions: formatInstructions(sorted),
    activationSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          enum: names,
          description: 'The name of the skill to activate.',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  };
};

const validateSummaries = (summaries: readonly SkillSummary[]): void => {
  const names = new Set<string>();
  for (const summary of summaries) {
    if (!summary.name || !summary.description) {
      throw new Error('Skill summaries require a name and description');
    }
    if (names.has(summary.name)) {
      throw new Error(`Duplicate skill summary name: ${summary.name}`);
    }
    names.add(summary.name);
  }
};

const formatInstructions = (summaries: readonly SkillSummary[]): string => {
  const entries = summaries
    .map(
      ({ name, description }) =>
        `  <skill>\n    <name>${escapeXml(name)}</name>\n` +
        `    <description>${escapeXml(description)}</description>\n  </skill>`,
    )
    .join('\n');

  return [
    'Additional skills are available through progressive disclosure.',
    'Call activate_skill with one of the exact names below before using it.',
    '<available_skills>',
    entries,
    '</available_skills>',
  ].join('\n');
};

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

const escapeXml = (value: string): string =>
  value.replaceAll(
    /[&<>"']/g,
    (character) => XML_ENTITIES[character] ?? character,
  );
