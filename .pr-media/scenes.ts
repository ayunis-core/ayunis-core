import type { PrMediaScene } from './types';

const API_URL = process.env.E2E_API_URL ?? '';

export default [
  {
    name: 'admin-integrations-toggle',
    path: '/admin-settings/integrations',
    viewports: ['desktop'],
    waitFor: async ({ page, expect }) => {
      const response = await page.request.post(
        `${API_URL}/api/mcp-integrations/custom`,
        {
          data: {
            name: 'AYC-941 Demo Integration',
            serverUrl: 'https://mcp.example.com/mcp',
            configSchema: { authType: 'CUSTOM', orgFields: [], userFields: [] },
            orgConfigValues: {},
          },
        },
      );
      expect(
        response.ok(),
        `create failed: ${response.status()} ${await response.text()}`,
      ).toBe(true);
      await page.reload();
      return page.getByRole('switch');
    },
    demos: [
      {
        name: 'deactivate',
        action: async ({ page, expect }) => {
          const toggle = page.getByRole('switch');
          await expect(toggle).toBeChecked();
          await toggle.click();
          await expect(toggle).not.toBeChecked();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
