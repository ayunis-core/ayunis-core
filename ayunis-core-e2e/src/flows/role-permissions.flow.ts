import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type {
  ConfigurableRole,
  Permission,
  TeamAdminPermission,
} from '../clients/api/role-permissions.client';

export async function setPermissionInMatrix(
  page: Page,
  permission: Permission,
  role: ConfigurableRole,
  granted: boolean,
): Promise<void> {
  await page.goto('/admin-settings/roles');
  const checkbox = page.getByRole('checkbox', {
    name: `${permission}-${role}`,
  });
  const target = granted ? 'checked' : 'unchecked';
  await expect(checkbox).toHaveAttribute('data-state', /checked/);
  if ((await checkbox.getAttribute('data-state')) !== target) {
    await checkbox.click();
  }
  await expect(checkbox).toHaveAttribute('data-state', target);
  const save = page.getByTestId('roles-save');
  const persisted = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`/api/role-permissions/${role}`),
  );
  await save.click();
  expect((await persisted).ok()).toBe(true);
  await expect(save).toBeDisabled();
}

export async function setTeamAdminPermissionInCard(
  page: Page,
  permission: TeamAdminPermission,
  granted: boolean,
): Promise<void> {
  await page.goto('/admin-settings/roles');
  const checkbox = page.getByRole('checkbox', {
    name: `${permission}-teamAdmin`,
  });
  const target = granted ? 'checked' : 'unchecked';
  await expect(checkbox).toHaveAttribute('data-state', /checked/);
  if ((await checkbox.getAttribute('data-state')) !== target) {
    await checkbox.click();
  }
  await expect(checkbox).toHaveAttribute('data-state', target);
  const save = page.getByTestId('team-admin-permissions-save');
  const persisted = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes('/api/team-admin-permissions'),
  );
  await save.click();
  expect((await persisted).ok()).toBe(true);
  await expect(save).toBeDisabled();
}
