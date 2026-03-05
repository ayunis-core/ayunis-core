export const SYSTEM_PREFIX = 'system';
export const USER_PREFIX = 'user';

const SLUG_SEPARATOR = '__';

export type SkillPrefix = typeof SYSTEM_PREFIX | typeof USER_PREFIX;

export interface SkillEntry {
  slug: string;
  description: string;
}

export function slugify(name: string): string {
  const result = name
    .replace(/ä/g, 'ae')
    .replace(/Ä/g, 'Ae')
    .replace(/ö/g, 'oe')
    .replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '');

  if (result === '') {
    throw new Error(`slugify produced an empty slug for input: "${name}"`);
  }

  return result;
}

export function buildSkillSlug(prefix: SkillPrefix, name: string): string {
  return `${prefix}${SLUG_SEPARATOR}${slugify(name)}`;
}

export interface ParsedSkillSlug {
  prefix: SkillPrefix;
  slug: string;
}

export function parseSkillSlug(slug: string): ParsedSkillSlug {
  const systemFull = `${SYSTEM_PREFIX}${SLUG_SEPARATOR}`;
  const userFull = `${USER_PREFIX}${SLUG_SEPARATOR}`;

  let prefix: SkillPrefix | undefined;
  let remainder: string | undefined;

  if (slug.startsWith(systemFull)) {
    prefix = SYSTEM_PREFIX;
    remainder = slug.slice(systemFull.length);
  } else if (slug.startsWith(userFull)) {
    prefix = USER_PREFIX;
    remainder = slug.slice(userFull.length);
  }

  if (prefix === undefined || remainder === undefined) {
    throw new Error(`Invalid skill slug: missing prefix in "${slug}"`);
  }

  if (remainder === '') {
    throw new Error(`Invalid skill slug: empty slug after prefix in "${slug}"`);
  }

  return { prefix, slug: remainder };
}

export class SlugCollisionError extends Error {
  constructor(slug: string, existingName: string, newName: string) {
    super(
      `Slug collision: "${existingName}" and "${newName}" both produce slug "${slug}"`,
    );
    this.name = 'SlugCollisionError';
  }
}

export function buildSlugMap(
  entries: { name: string; prefix: SkillPrefix }[],
): Map<string, string> {
  const slugToName = new Map<string, string>();

  for (const entry of entries) {
    const slug = buildSkillSlug(entry.prefix, entry.name);
    const existing = slugToName.get(slug);
    if (existing !== undefined && existing !== entry.name) {
      throw new SlugCollisionError(slug, existing, entry.name);
    }
    slugToName.set(slug, entry.name);
  }

  return slugToName;
}
