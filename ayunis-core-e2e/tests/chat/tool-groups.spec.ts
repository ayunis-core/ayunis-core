import { randomUUID } from "node:crypto";
import { login } from "../../src/clients/api/auth.client";
import { createChat } from "../../src/clients/api/memory.client";
import {
  getUserRolePermissions,
  setUserRolePermissions,
} from "../../src/clients/api/role-permissions.client";
import { reportToolGroups } from "../../src/clients/api/tool-groups.client";
import type { UpdateRolePermissionsDtoPermissionsItem } from "../../src/clients/generated/ayunisCoreAPI.schemas";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { expect, test } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };
const MANAGEMENT_PERMISSIONS = [
  "manage_skills",
  "install_marketplace_skills",
  "manage_routines",
];
const MANAGEMENT_GROUPS = ["skill_management", "routine_management"];
const ON_DEMAND_TOOLS = [
  "create_document",
  "code_execution",
  "send_email",
  "create_routine",
  "create_skill",
  "add_anonymization_exception",
  "recording_search",
];

// Same database, served by a second backend started with routines, recordings
// and memory disabled (see .github/workflows/e2e-tests.yml).
const disabledApiUrl =
  process.env.E2E_MEMORY_DISABLED_API_URL ??
  process.env.E2E_MEMORY_DISABLED_BASE_URL ??
  "http://localhost:3003";

// Changes the USER role of its own organization, so it cannot affect the
// worker organization other specs share.
test("a new chat offers management tool groups only to users who may manage, and anonymization exceptions only to admins", async ({
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `tool-groups-${key}`,
    test.info().outputPath("tool-groups-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const member = await createMemberSession(adminApi, mail, `tool-groups-${key}`);
  try {
    const admin = await reportToolGroups(adminApi, await createChat(adminApi));
    expect(admin.groups).toEqual(
      expect.arrayContaining([...MANAGEMENT_GROUPS, "anonymization_exceptions"]),
    );
    expect(admin.tools).toContain("load_tools");
    for (const tool of ON_DEMAND_TOOLS) expect(admin.tools).not.toContain(tool);

    const defaults = await getUserRolePermissions(adminApi);
    await setUserRolePermissions(
      adminApi,
      defaults.filter(
        (permission) => !MANAGEMENT_PERMISSIONS.includes(permission),
      ) as UpdateRolePermissionsDtoPermissionsItem[],
    );
    const denied = await reportToolGroups(
      member.api,
      await createChat(member.api),
    );
    for (const group of [...MANAGEMENT_GROUPS, "anonymization_exceptions"]) {
      expect(denied.groups).not.toContain(group);
    }

    await setUserRolePermissions(
      adminApi,
      defaults as UpdateRolePermissionsDtoPermissionsItem[],
    );
    const allowed = await reportToolGroups(
      member.api,
      await createChat(member.api),
    );
    expect(allowed.groups).toEqual(expect.arrayContaining(MANAGEMENT_GROUPS));
    expect(allowed.groups).not.toContain("anonymization_exceptions");
  } finally {
    await member.api.dispose();
    await adminApi.dispose();
  }
});

test("a new chat lists no routine, recording or chat history group while their features are disabled", async ({
  api,
}) => {
  const enabled = await reportToolGroups(api, await createChat(api));
  expect(enabled.groups).toEqual(
    expect.arrayContaining(["routine_management", "recordings"]),
  );

  const disabled = await reportToolGroups(
    api,
    await createChat(api),
    disabledApiUrl,
  );

  expect(disabled.groups).not.toContain("routine_management");
  expect(disabled.groups).not.toContain("recordings");
  expect(disabled.groups).not.toContain("chat_history");
  expect(disabled.groups).toContain("code_execution");
});
