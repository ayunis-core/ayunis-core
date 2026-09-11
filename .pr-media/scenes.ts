import type { PrMediaScene } from './types';

export default [
  {
    name: 'integration-edit-connection-settings',
    path: '/admin-settings/integrations',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page, expect, viewport }) => {
      const suffix = `${Date.now()}-${viewport}`;
      const response = await page.request.post('/api/mcp-integrations/custom', {
        data: {
          name: `Document archive ${suffix}`,
          serverUrl: 'https://documents.example.com/mcp',
          configSchema: {
            authType: 'CUSTOM',
            orgFields: [
              {
                key: 'apiToken',
                label: 'API token',
                type: 'secret',
                headerName: 'X-Archive-Token',
                prefix: 'Bearer ',
                required: true,
              },
            ],
            userFields: [],
          },
          orgConfigValues: { apiToken: `secret-${suffix}` },
        },
      });
      expect(response.ok()).toBeTruthy();
      const integration = (await response.json()) as { id: string };

      await page.reload();
      const card = page.getByTestId(`integration-card-${integration.id}`);
      await expect(card).toBeVisible();
      await card.getByTestId('integration-actions').click();
      await page.getByTestId('integration-edit-action').click();

      return page.getByRole('dialog');
    },
  },
] satisfies PrMediaScene[];
