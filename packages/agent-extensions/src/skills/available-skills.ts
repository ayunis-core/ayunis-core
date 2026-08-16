import type { JsonSchema } from '@ayunis/agent-runtime';

import type { SkillSummary } from './skill-definition';

export interface AvailableSkills {
  readonly summaries: ReadonlyMap<string, SkillSummary>;
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
    summaries: new Map(sorted.map((summary) => [summary.name, summary])),
    names,
    instructions: formatInstructions(sorted),
    activationSchema: activationSchema(names),
  };
};

const validateSummaries = (summaries: readonly SkillSummary[]): void => {
  const names = new Set<string>();
  for (const summary of summaries) {
    if (!summary.name || !summary.description) {
      throw new Error('Skill summaries require a name and description.');
    }
    if (names.has(summary.name)) {
      throw new Error(`Duplicate skill summary name '${summary.name}'.`);
    }
    names.add(summary.name);
  }
};

const formatInstructions = (summaries: readonly SkillSummary[]): string => {
  if (summaries.length === 0) {
    return '';
  }
  const entries = summaries
    .map(
      ({ name, description }) =>
        `  <skill>\n    <name>${escapeXml(name)}</name>\n` +
        `    <description>${escapeXml(description)}</description>\n  </skill>`,
    )
    .join('\n');
  return [
    'Additional skills are available through progressive disclosure.',
    'Call activate_skill with one exact name before using that skill.',
    '<available_skills>',
    entries,
    '</available_skills>',
  ].join('\n');
};

const activationSchema = (names: readonly string[]): JsonSchema => ({
  type: 'object',
  properties: {
    name: {
      type: 'string',
      enum: [...names],
      description: 'The exact name of the skill to activate.',
    },
  },
  required: ['name'],
  additionalProperties: false,
});

const escapeXml = (value: string): string =>
  value.replaceAll(
    /[&<>"']/g,
    (character) => XML_ENTITIES[character] ?? character,
  );

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};
