import {
  createCustomIntegration,
  getIntegration,
  getUserIntegrationConfig,
  setUserIntegrationConfig,
  updateIntegration,
} from "../../src/clients/api/integrations.client";
import { config } from "../../src/config";
import { test, expect } from "../../src/fixtures/test";

test("edits a custom integration connection without replacing its secret", async ({
  page,
  api,
}) => {
  const suffix = Date.now();
  const integration = await createCustomIntegration(api, {
    name: `Document archive ${suffix}`,
    serverUrl: `${config.apiURL}/health`,
    configSchema: {
      authType: "CUSTOM",
      orgFields: [
        {
          key: "apiToken",
          label: "API token",
          type: "secret",
          headerName: "X-Archive-Token",
          required: true,
        },
      ],
      userFields: [],
    },
    orgConfigValues: { apiToken: `secret-${suffix}` },
  });

  await page.goto("/admin-settings/integrations");
  const card = page.getByTestId(`integration-card-${integration.id}`);
  await card.getByTestId("integration-actions").click();
  await page.getByTestId("integration-edit-action").click();

  const updatedUrl = `${config.apiURL}/health?updated=${suffix}`;
  await page.getByTestId("integration-edit-server-url").fill(updatedUrl);
  await page
    .getByTestId("integration-edit-field-0-header-name")
    .fill("Authorization");
  await page.getByTestId("integration-edit-submit").click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("integration-edit-submit")).toBeEnabled();
  await expect
    .poll(async () => {
      const updated = await getIntegration(api, integration.id);
      const schema = updated.configSchema as {
        orgFields: Array<{ headerName?: string }>;
      };
      return {
        serverUrl: updated.serverUrl,
        headerName: schema.orgFields[0]?.headerName,
        secret: updated.orgConfigValues?.apiToken,
      };
    })
    .toEqual({
      serverUrl: updatedUrl,
      headerName: "Authorization",
      secret: "••••••",
    });
});

test("closes cleanly after editing an integration that requires user config", async ({
  page,
  api,
}) => {
  const suffix = Date.now();
  const integration = await createCustomIntegration(api, {
    name: `Personal archive ${suffix}`,
    serverUrl: `${config.apiURL}/health`,
    configSchema: {
      authType: "CUSTOM",
      orgFields: [],
      userFields: [
        {
          key: "apiToken",
          label: "API token",
          type: "secret",
          headerName: "X-Archive-Token",
          required: true,
        },
      ],
    },
    orgConfigValues: {},
  });

  await page.goto("/admin-settings/integrations");
  const card = page.getByTestId(`integration-card-${integration.id}`);
  await card.getByTestId("integration-actions").click();
  await page.getByTestId("integration-edit-action").click();
  await page
    .getByTestId("integration-edit-field-0-header-name")
    .fill("Authorization");
  await page.getByTestId("integration-edit-submit").click();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => document.body.style.pointerEvents))
    .toBe("");
  await expect
    .poll(async () => {
      const updated = await getIntegration(api, integration.id);
      const schema = updated.configSchema as {
        userFields: Array<{ headerName?: string }>;
      };
      return schema.userFields[0]?.headerName;
    })
    .toBe("Authorization");
});

test("removes stored user secrets when their configuration field is deleted", async ({
  api,
}) => {
  const suffix = Date.now();
  const userField = {
    key: "personalToken",
    label: "Personal token",
    type: "secret" as const,
    headerName: "Authorization",
    required: true,
  };
  const integration = await createCustomIntegration(api, {
    name: `Disposable user config ${suffix}`,
    serverUrl: `${config.apiURL}/health`,
    configSchema: {
      authType: "CUSTOM",
      orgFields: [],
      userFields: [userField],
    },
    orgConfigValues: {},
  });
  await setUserIntegrationConfig(api, integration.id, {
    configValues: { personalToken: `secret-${suffix}` },
  });

  await updateIntegration(api, integration.id, {
    configSchema: {
      authType: "CUSTOM",
      orgFields: [],
      userFields: [],
    },
  });
  await updateIntegration(api, integration.id, {
    configSchema: {
      authType: "CUSTOM",
      orgFields: [],
      userFields: [userField],
    },
  });

  const userConfig = await getUserIntegrationConfig(api, integration.id);
  expect(userConfig.configValues).toEqual({});
});
