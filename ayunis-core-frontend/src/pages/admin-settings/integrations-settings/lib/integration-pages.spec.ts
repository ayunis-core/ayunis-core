import { describe, expect, it } from 'vitest';
import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';
import {
  pageOfIntegration,
  sortIntegrationsByName,
  upsertIntegration,
} from './integration-pages';

const integration = (id: string, name: string) =>
  ({ id, name }) as McpIntegration;

const existing = Array.from({ length: 12 }, (_, i) =>
  integration(`id-${i}`, `Integration ${String(i).padStart(2, '0')}`),
);

const pageAfterSave = (saved: McpIntegration) =>
  pageOfIntegration(
    sortIntegrationsByName(upsertIntegration(existing, saved)),
    saved.id,
  );

describe('pageOfIntegration', () => {
  it('finds the page a newly created integration sorts onto', () => {
    expect(pageAfterSave(integration('new', 'Zendesk'))).toBe(2);
    expect(pageAfterSave(integration('new', 'Asana'))).toBe(1);
  });

  it('uses the new name of a renamed integration', () => {
    expect(pageAfterSave(integration('id-0', 'Zendesk'))).toBe(2);
    expect(pageAfterSave(integration('id-11', 'Asana'))).toBe(1);
  });

  it('returns undefined for an integration that is not in the list', () => {
    expect(pageOfIntegration(existing, 'missing')).toBeUndefined();
  });
});
