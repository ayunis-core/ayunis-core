import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
} from "../../src/clients/api/teams.client";
import {
  requestDeleteWorkspace,
  requestOwnershipCandidates,
  requestRenameWorkspace,
  requestTransferOwnership,
} from "../../src/clients/api/workspace-ownership.client";
import {
  listedWorkspaceIds,
  requestGetWorkspace,
  requestOrganizationSharing,
  requestRemoveMember,
  requestShare,
  requestSharing,
} from "../../src/clients/api/workspace-sharing.client";
import { createProjectThread } from "../../src/factories/workspace-context.factory";
import {
  createSignedInMember,
  type SignedInMember,
} from "../../src/factories/user.factory";

async function workspaceOf(api: APIRequestContext, name: string) {
  return generatedApi.workspacesControllerCreate(
    { name, description: "", icon: "building-2" },
    { api },
  );
}

async function workspaceAs(api: APIRequestContext, workspaceId: string) {
  const response = await requestGetWorkspace(api, workspaceId);
  if (response.status() !== 200) return response.status();
  return (await response.json()) as { name: string; accessLevel: string };
}

async function accessLevelOf(api: APIRequestContext, workspaceId: string) {
  const workspace = await workspaceAs(api, workspaceId);
  return typeof workspace === "number" ? workspace : workspace.accessLevel;
}

async function candidateIds(api: APIRequestContext, workspaceId: string) {
  const response = await requestOwnershipCandidates(api, workspaceId);
  const body = (await response.json()) as { people: { id: string }[] };
  return body.people.map(({ id }) => id);
}

async function threadIdsOf(api: APIRequestContext): Promise<string[]> {
  const threads = await generatedApi.threadsControllerFindAll(
    { limit: 100 },
    { api },
  );
  return threads.data.map(({ id }) => id);
}

async function cleanUp(api: APIRequestContext, members: SignedInMember[]) {
  for (const member of members) {
    await generatedApi.userControllerDeleteUser(member.id, { api });
    await member.api.dispose();
  }
}

test("only the owner hands over or deletes a workspace; full access may edit its details", async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const suffix = `own-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const sabine = await createSignedInMember(api, mail, `${suffix}-sabine`);
  const jonas = await createSignedInMember(api, mail, `${suffix}-jonas`);

  try {
    const workspace = await workspaceOf(tobias.api, `Haushalt ${suffix}`);
    await requestShare(tobias.api, workspace.id, { userIds: [lena.id], accessLevel: "edit" });
    await requestShare(tobias.api, workspace.id, { userIds: [sabine.id], accessLevel: "full" });

    expect((await requestRenameWorkspace(lena.api, workspace.id, "Von Lena")).status()).toBe(403);
    expect((await requestRenameWorkspace(jonas.api, workspace.id, "Von Jonas")).status()).toBe(404);
    const renamed = await requestRenameWorkspace(sabine.api, workspace.id, `Haushalt 2027 ${suffix}`);
    expect(renamed.status()).toBe(200);
    expect(await renamed.json()).toMatchObject({ accessLevel: "full", memberCount: 3 });
    expect(await workspaceAs(lena.api, workspace.id)).toMatchObject({
      name: `Haushalt 2027 ${suffix}`,
      accessLevel: "edit",
    });

    expect((await requestDeleteWorkspace(sabine.api, workspace.id)).status()).toBe(403);
    expect((await requestDeleteWorkspace(jonas.api, workspace.id)).status()).toBe(404);
    expect(await accessLevelOf(sabine.api, workspace.id)).toBe("full");

    expect(await candidateIds(tobias.api, workspace.id)).toEqual([lena.id, sabine.id]);
    expect((await requestOwnershipCandidates(sabine.api, workspace.id)).status()).toBe(403);
    expect((await requestTransferOwnership(sabine.api, workspace.id, lena.id)).status()).toBe(403);
    expect((await requestTransferOwnership(tobias.api, workspace.id, jonas.id)).status()).toBe(422);
    expect((await requestTransferOwnership(tobias.api, workspace.id, tobias.id)).status()).toBe(422);
    expect(await accessLevelOf(tobias.api, workspace.id)).toBe("owner");

    const transferred = await requestTransferOwnership(tobias.api, workspace.id, lena.id);
    expect(transferred.status()).toBe(200);
    expect(await transferred.json()).toMatchObject({ accessLevel: "full" });
    expect(await accessLevelOf(lena.api, workspace.id)).toBe("owner");
    expect(await accessLevelOf(tobias.api, workspace.id)).toBe("full");
    const view = await (await requestSharing(lena.api, workspace.id)).json();
    expect(view.owner).toMatchObject({ userId: lena.id, isOwner: true });
    expect(view.people).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: tobias.id, accessLevel: "full" }),
      ]),
    );

    expect((await requestDeleteWorkspace(tobias.api, workspace.id)).status()).toBe(403);
    expect((await requestRenameWorkspace(tobias.api, workspace.id, `Haushalt ${suffix}`)).status()).toBe(200);
    expect((await requestDeleteWorkspace(lena.api, workspace.id)).status()).toBe(204);

    for (const member of [tobias, lena, sabine]) {
      expect(await accessLevelOf(member.api, workspace.id)).toBe(404);
      expect(await listedWorkspaceIds(member.api)).not.toContain(workspace.id);
    }
  } finally {
    await cleanUp(api, [tobias, lena, sabine, jonas]);
  }
});

test("team and organisation members can take over a workspace, excluded people cannot", async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const suffix = `own-reach-${Date.now()}`;
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const jonas = await createSignedInMember(api, mail, `${suffix}-jonas`);
  const sabine = await createSignedInMember(api, mail, `${suffix}-sabine`);
  const team = await createTeam(api, `Bauamt ${suffix}`);

  try {
    await addTeamMember(api, team.id, jonas.id);
    const workspace = await workspaceOf(api, `Gemeinderat ${suffix}`);
    await requestShare(api, workspace.id, { teamIds: [team.id], accessLevel: "use" });
    await requestOrganizationSharing(api, workspace.id, true);
    await requestRemoveMember(api, workspace.id, lena.id);

    const candidates = await candidateIds(api, workspace.id);
    expect(candidates).toEqual(expect.arrayContaining([jonas.id, sabine.id]));
    expect(candidates).not.toContain(lena.id);
    expect((await requestTransferOwnership(api, workspace.id, lena.id)).status()).toBe(422);

    expect((await requestTransferOwnership(api, workspace.id, sabine.id)).status()).toBe(200);
    expect(await accessLevelOf(sabine.api, workspace.id)).toBe("owner");
    expect(await accessLevelOf(jonas.api, workspace.id)).toBe("use");
    expect((await requestDeleteWorkspace(sabine.api, workspace.id)).status()).toBe(204);
  } finally {
    await deleteTeam(api, team.id);
    await cleanUp(api, [lena, jonas, sabine]);
  }
});

test("deleting the owner's account hands shared workspaces to the member with the most rights", async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const suffix = `own-leave-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const sabine = await createSignedInMember(api, mail, `${suffix}-sabine`);

  try {
    const shared = await workspaceOf(tobias.api, `Haushalt ${suffix}`);
    await workspaceOf(tobias.api, `Notizen ${suffix}`);
    await requestShare(tobias.api, shared.id, { userIds: [lena.id], accessLevel: "edit" });
    await requestShare(tobias.api, shared.id, { userIds: [sabine.id], accessLevel: "full" });
    const thread = await createProjectThread(lena.api, shared.id);

    await generatedApi.userControllerDeleteUser(tobias.id, { api });
    await tobias.api.dispose();

    expect(await accessLevelOf(sabine.api, shared.id)).toBe("owner");
    expect(await accessLevelOf(lena.api, shared.id)).toBe("edit");
    expect(await threadIdsOf(lena.api)).toContain(thread.id);
    const view = await (await requestSharing(sabine.api, shared.id)).json();
    expect(view.memberCount).toBe(2);
    expect((await requestDeleteWorkspace(sabine.api, shared.id)).status()).toBe(204);
  } finally {
    await cleanUp(api, [lena, sabine]);
  }
});
