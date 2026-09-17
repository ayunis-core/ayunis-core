import type { PrMediaScene } from './types';

type UserList = {
  data: Array<{ id: string; email: string }>;
};

export default [
  {
    name: 'personal-credit-limit-enforced',
    path: '/login',
    viewports: ['desktop'],
    waitFor: async ({ page, expect }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.getByTestId('email').fill('admin@usage.local');
      await page.getByTestId('login-continue').click();
      await page.getByTestId('password').fill('admin');
      await page.getByTestId('submit').click();

      const usersResponse = await page.request.get('/api/users?limit=100');
      expect(usersResponse.ok()).toBeTruthy();
      const users = (await usersResponse.json()) as UserList;
      const carla = users.data.find(
        ({ email }) => email === 'carla@usage.local',
      );
      expect(carla).toBeDefined();

      const limitResponse = await page.request.put(
        `/api/credit-limits/users/${carla!.id}`,
        { data: { monthlyCredits: 251 } },
      );
      expect(limitResponse.ok()).toBeTruthy();

      await page.goto(
        '/admin-settings/credit-limits?tab=users&search=Carla&page=1',
      );
      const closeWelcome = page.getByRole('button', { name: 'Schließen' });
      if (await closeWelcome.isVisible()) await closeWelcome.click();

      const row = page.getByTestId(`credit-limits-row-${carla!.id}`);
      await expect(row).toContainText('251');
      await expect(row).toContainText('250');
      return row;
    },
  },
] satisfies PrMediaScene[];
