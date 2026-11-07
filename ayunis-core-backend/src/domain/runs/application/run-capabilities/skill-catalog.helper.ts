import type { Logger } from '@nestjs/common';
import {
  buildSkillSlug,
  SlugCollisionError,
  SYSTEM_PREFIX,
  USER_PREFIX,
  WORKSPACE_PREFIX,
  type SkillEntry,
  type SkillPrefix,
} from 'src/common/util/skill-slug';
import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { SkillTemplate } from 'src/domain/skill-templates/domain/skill-template.entity';
import type { SkillCatalog } from './run-capability-context';

interface SkillInput {
  name: string;
  prefix: SkillPrefix;
  description: string;
}

export function buildSkillCatalog(
  skills: Skill[],
  alwaysOnTemplates: SkillTemplate[],
  logger: Logger,
): SkillCatalog {
  const { slugMap, entries } = buildSkillSlugs(
    skills,
    alwaysOnTemplates,
    logger,
  );
  return {
    slugMap,
    entries,
    editableSkillIds: buildEditableSkillIds(skills, slugMap, logger),
  };
}

/**
 * Errors are handled per entry so a single problematic skill (collision or
 * un-slugifiable name) only removes that entry.
 */
function buildSkillSlugs(
  skills: Skill[],
  alwaysOnTemplates: SkillTemplate[],
  logger: Logger,
): { slugMap: Map<string, string>; entries: SkillEntry[] } {
  const slugMap = new Map<string, string>();
  const entries: SkillEntry[] = [];
  const inputs: SkillInput[] = [
    ...skills.map((s): SkillInput => ({
      name: s.name,
      prefix: skillPrefix(s),
      description: s.shortDescription,
    })),
    ...alwaysOnTemplates.map((t): SkillInput => ({
      name: t.name,
      prefix: SYSTEM_PREFIX,
      description: t.shortDescription,
    })),
  ];

  for (const input of inputs) {
    try {
      const slug = buildSkillSlug(input.prefix, input.name);
      const existing = slugMap.get(slug);
      if (existing !== undefined && existing !== input.name) {
        throw new SlugCollisionError(slug, existing, input.name);
      }
      slugMap.set(slug, input.name);
      entries.push({ slug, description: input.description });
    } catch (error) {
      const message =
        error instanceof SlugCollisionError
          ? 'Slug collision, skipping skill'
          : 'Failed to build slug for skill, skipping';
      const detail = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ skillName: input.name, error: detail }, message);
    }
  }

  return { slugMap, entries };
}

function buildEditableSkillIds(
  skills: Skill[],
  advertisedSlugs: Map<string, string>,
  logger: Logger,
): Map<string, string> {
  const skillIds = new Map<string, string>();
  for (const skill of skills) {
    try {
      const slug = buildSkillSlug(skillPrefix(skill), skill.name);
      if (advertisedSlugs.get(slug) !== skill.name || skillIds.has(slug)) {
        throw new SlugCollisionError(
          slug,
          advertisedSlugs.get(slug) ?? 'unknown',
          skill.name,
        );
      }
      skillIds.set(slug, skill.id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(
        { skillName: skill.name, error: detail },
        'Failed to build editable skill slug, skipping',
      );
    }
  }
  return skillIds;
}

function skillPrefix(skill: Skill): SkillPrefix {
  return skill instanceof WorkspaceSkill ? WORKSPACE_PREFIX : USER_PREFIX;
}
