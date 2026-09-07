import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import de from '@/shared/locales/de/admin-settings-integrations.json';
import en from '@/shared/locales/en/admin-settings-integrations.json';
import { resolveValidateIntegrationErrorMessage } from './resolve-validate-integration-error-message';

function tFrom(locale: typeof de | typeof en): TFunction {
  return ((key: string, options?: Record<string, unknown>) => {
    const template = key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, locale);
    if (typeof template !== 'string') {
      return key;
    }
    return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
      const value = options?.[name];
      return typeof value === 'string' ? value : '';
    });
  }) as TFunction;
}

describe('resolveValidateIntegrationErrorMessage', () => {
  it('shows the backend reason in German copy', () => {
    const message = resolveValidateIntegrationErrorMessage(
      tFrom(de),
      'Ungültiges Token',
    );

    expect(message).toContain('Ungültiges Token');
    expect(message).toContain('Integration konnte nicht validiert werden');
  });

  it('shows the backend reason in English copy', () => {
    const message = resolveValidateIntegrationErrorMessage(
      tFrom(en),
      'Connection refused',
    );

    expect(message).toContain('Connection refused');
    expect(message).not.toBe(
      'Failed to validate integration. Please try again.',
    );
  });

  it('falls back to the generic message when the backend returns no reason', () => {
    expect(resolveValidateIntegrationErrorMessage(tFrom(de), undefined)).toBe(
      'Integration konnte nicht validiert werden. Bitte versuchen Sie es erneut.',
    );
    expect(resolveValidateIntegrationErrorMessage(tFrom(de), '')).toBe(
      'Integration konnte nicht validiert werden. Bitte versuchen Sie es erneut.',
    );
    expect(resolveValidateIntegrationErrorMessage(tFrom(de), '   ')).toBe(
      'Integration konnte nicht validiert werden. Bitte versuchen Sie es erneut.',
    );
    expect(resolveValidateIntegrationErrorMessage(tFrom(en), undefined)).toBe(
      'Failed to validate integration. Please try again.',
    );
  });

  it('keeps server-provided markup as plain characters', () => {
    const message = resolveValidateIntegrationErrorMessage(
      tFrom(en),
      '<b>unauthorized</b>',
    );

    expect(message).toContain('<b>unauthorized</b>');
    expect(typeof message).toBe('string');
  });
});
