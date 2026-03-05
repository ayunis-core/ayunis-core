import {
  slugify,
  buildSkillSlug,
  parseSkillSlug,
  buildSlugMap,
  SlugCollisionError,
  SYSTEM_PREFIX,
  USER_PREFIX,
} from './skill-slug';

describe('skill-slug', () => {
  describe('slugify', () => {
    it('should produce lowercase hyphenated strings', () => {
      expect(slugify('German Administrative Law')).toBe(
        'german-administrative-law',
      );
    });

    it('should strip leading and trailing hyphens', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });

    it('should replace special characters with hyphens', () => {
      expect(slugify('QA & Testing (v2)')).toBe('qa-testing-v2');
    });

    it('should collapse multiple separators into one hyphen', () => {
      expect(slugify('foo---bar')).toBe('foo-bar');
    });

    it('should transliterate German umlauts to ASCII equivalents (DIN 5007-2)', () => {
      expect(slugify('Bürgerbüro Anfragen')).toBe('buergerbuero-anfragen');
    });

    it('should distinguish umlauts from base vowels', () => {
      expect(slugify('Bürger')).toBe('buerger');
      expect(slugify('Burger')).toBe('burger');
    });

    it('should transliterate uppercase umlauts', () => {
      expect(slugify('Über Öffentliche Ämter')).toBe(
        'ueber-oeffentliche-aemter',
      );
    });

    it('should replace German ß with ss', () => {
      expect(slugify('Straßenverkehr')).toBe('strassenverkehr');
    });

    it('should throw on empty input', () => {
      expect(() => slugify('')).toThrow('slugify produced an empty slug');
    });

    it('should throw on special-char-only input', () => {
      expect(() => slugify('!!!')).toThrow('slugify produced an empty slug');
    });
  });

  describe('buildSkillSlug', () => {
    it('should prefix with system__', () => {
      expect(buildSkillSlug(SYSTEM_PREFIX, 'Data Privacy')).toBe(
        'system__data-privacy',
      );
    });

    it('should prefix with user__', () => {
      expect(buildSkillSlug(USER_PREFIX, 'Data Analysis')).toBe(
        'user__data-analysis',
      );
    });
  });

  describe('parseSkillSlug', () => {
    it('should split system__ prefix correctly', () => {
      const result = parseSkillSlug('system__data-privacy');
      expect(result).toEqual({ prefix: 'system', slug: 'data-privacy' });
    });

    it('should split user__ prefix correctly', () => {
      const result = parseSkillSlug('user__data-analysis');
      expect(result).toEqual({ prefix: 'user', slug: 'data-analysis' });
    });

    it('should throw on missing prefix', () => {
      expect(() => parseSkillSlug('data-analysis')).toThrow(
        'Invalid skill slug: missing prefix',
      );
    });

    it('should throw on invalid prefix', () => {
      expect(() => parseSkillSlug('admin__some-skill')).toThrow(
        'Invalid skill slug: missing prefix',
      );
    });

    it('should throw on empty slug after prefix', () => {
      expect(() => parseSkillSlug('system__')).toThrow(
        'Invalid skill slug: empty slug after prefix',
      );
      expect(() => parseSkillSlug('user__')).toThrow(
        'Invalid skill slug: empty slug after prefix',
      );
    });
  });

  describe('buildSlugMap', () => {
    it('should build a map from slug to original name', () => {
      const map = buildSlugMap([
        { name: 'Data Privacy', prefix: SYSTEM_PREFIX },
        { name: 'Budget Analysis', prefix: USER_PREFIX },
      ]);

      expect(map.get('system__data-privacy')).toBe('Data Privacy');
      expect(map.get('user__budget-analysis')).toBe('Budget Analysis');
    });

    it('should throw SlugCollisionError when two different names produce the same slug', () => {
      expect(() =>
        buildSlugMap([
          { name: 'Foo Bar', prefix: SYSTEM_PREFIX },
          { name: 'foo-bar', prefix: SYSTEM_PREFIX },
        ]),
      ).toThrow(SlugCollisionError);
    });

    it('should allow duplicate entries with the same name', () => {
      const map = buildSlugMap([
        { name: 'Data Privacy', prefix: SYSTEM_PREFIX },
        { name: 'Data Privacy', prefix: SYSTEM_PREFIX },
      ]);

      expect(map.size).toBe(1);
    });
  });
});
