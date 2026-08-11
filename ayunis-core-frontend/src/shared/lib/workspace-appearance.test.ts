import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORKSPACE_ICON,
  WORKSPACE_COLOR_ORDER,
  WORKSPACE_ICON_OPTIONS,
  WORKSPACE_ICONS,
  defaultWorkspaceColor,
  isCustomWorkspaceColor,
  isLightColor,
  isWorkspaceColorKey,
  isWorkspaceIconKey,
  resolveWorkspaceIconKey,
} from './workspace-appearance';

describe('workspace icons', () => {
  it('has no duplicate keys', () => {
    const keys = WORKSPACE_ICON_OPTIONS.map((option) => option.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('includes the default icon', () => {
    expect(isWorkspaceIconKey(DEFAULT_WORKSPACE_ICON)).toBe(true);
  });

  it('falls back to the default for an unknown key', () => {
    expect(resolveWorkspaceIconKey('not-an-icon')).toBe(DEFAULT_WORKSPACE_ICON);
  });

  it('does not treat prototype keys as icons', () => {
    expect(isWorkspaceIconKey('constructor')).toBe(false);
    expect(resolveWorkspaceIconKey('toString')).toBe(DEFAULT_WORKSPACE_ICON);
  });

  it('keeps a known key', () => {
    expect(resolveWorkspaceIconKey('landmark')).toBe('landmark');
  });

  it('has an icon component for every option', () => {
    for (const option of WORKSPACE_ICON_OPTIONS) {
      expect(WORKSPACE_ICONS[option.key]).toBe(option.icon);
    }
  });
});

describe('workspace colours', () => {
  it('recognises palette keys', () => {
    expect(isWorkspaceColorKey('violet')).toBe(true);
    expect(isWorkspaceColorKey('#6b5bd6')).toBe(false);
  });

  it('recognises custom hex colours', () => {
    expect(isCustomWorkspaceColor('#6b5bd6')).toBe(true);
    expect(isCustomWorkspaceColor('violet')).toBe(false);
  });

  describe('isLightColor', () => {
    it.each([
      ['#ffffff', true],
      ['#ffff00', true],
      ['#000000', false],
      ['#6b5bd6', false],
    ])('%s -> %s', (hex, expected) => {
      expect(isLightColor(hex)).toBe(expected);
    });

    it('rejects malformed input rather than guessing', () => {
      expect(isLightColor('#fff')).toBe(false);
      expect(isLightColor('#zzzzzz')).toBe(false);
    });
  });

  describe('defaultWorkspaceColor', () => {
    it('is stable for the same name', () => {
      expect(defaultWorkspaceColor('Bürgeranfragen')).toBe(
        defaultWorkspaceColor('Bürgeranfragen'),
      );
    });

    it('ignores surrounding whitespace', () => {
      expect(defaultWorkspaceColor('  Feuerwehr ')).toBe(
        defaultWorkspaceColor('Feuerwehr'),
      );
    });

    it('always returns a palette key, even for an empty name', () => {
      expect(WORKSPACE_COLOR_ORDER).toContain(defaultWorkspaceColor(''));
      expect(WORKSPACE_COLOR_ORDER).toContain(defaultWorkspaceColor('🚒'));
    });
  });
});
