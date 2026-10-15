import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  removeTeamMember,
} from "../../src/clients/api/teams.client";
import {
  requestLinkItems,
  requestLinkedItems,
} from "../../src/clients/api/workspace-links.client";
import {
  listedWorkspaceIds,
  requestGetWorkspace,
  requestOrganizationSharing,
  requestEndTeamSharing,
  requestRemoveMember,
  requestSetMemberAccess,
  requestShare,
  requestShareCandidates,
  requestSharing,
  requestUpdateInstruction,
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

async function accessLevelOf(api: APIRequestContext, workspaceId: string) {
  const response = await requestGetWorkspace(api, workspaceId);
  if (response.status() !== 200) return response.status();
  return ((await response.json()) as { accessLevel: string }).accessLevel;
}

async function personalSkillOf(api: APIRequestContext, name: string) {
  return generatedApi.skillsControllerCreate(
    {
      ownerType: "personal",
      name,
      shortDescription: `${name} vorbereiten`,
      instructions: "Fasse die Unterlagen zusammen.",
    },
    { api },
  );
}

async function linkedSkillIds(api: APIRequestContext, workspaceId: string) {
  const response = await requestLinkedItems(api, "skills", workspaceId);
  const body = (await response.json()) as { data: { skill: { id: string } }[] };
  return body.data.map(({ skill }) => skill.id);
}

async function threadIdsOf(api: APIRequestContext): Promise<string[]> {
  const threads = await generatedApi.threadsControllerFindAll(
    { limit: 100 },
    { api },
  );
  return threads.data.map(({ id }) => id);
}

async function chatCountOf(api: APIRequestContext, workspaceId: string) {
  const list = await generatedApi.workspacesControllerFindAll(
    { limit: 100 },
    { api },
  );
  return list.data.find(({ id }) => id === workspaceId)?.chatCount;
}

async function cleanUp(api: APIRequestContext, members: SignedInMember[]) {
  for (const member of members) {
    await generatedApi.userControllerDeleteUser(member.id, { api });
    await member.api.dispose();
  }
}

test("a person invited directly gets access, can be raised and loses it with their own links when removed", async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const suffix = `share-person-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);

  try {
    const workspace = await workspaceOf(tobias.api, `Haushalt ${suffix}`);
    expect(await accessLevelOf(lena.api, workspace.id)).toBe(404);
    expect(await listedWorkspaceIds(lena.api)).not.toContain(workspace.id);

    expect(
      (await requestShare(tobias.api, workspace.id, { userIds: [lena.id], accessLevel: "use" })).status(),
    ).toBe(201);
    expect(await accessLevelOf(lena.api, workspace.id)).toBe("use");
    expect(await listedWorkspaceIds(lena.api)).toContain(workspace.id);
    expect(
      (await requestUpdateInstruction(lena.api, workspace.id, "Kurz antworten.")).status(),
    ).toBe(403);
    const lenaView = await (await requestSharing(lena.api, workspace.id)).json();
    expect(lenaView).toMatchObject({
      memberCount: 2,
      viewer: { accessLevel: "use", canInvite: false },
      people: [expect.objectContaining({ userId: lena.id, accessLevel: "use" })],
    });
    expect((await requestShare(lena.api, workspace.id, { userIds: [tobias.id], accessLevel: "use" })).status()).toBe(403);

    await requestSetMemberAccess(tobias.api, workspace.id, lena.id, "edit");
    expect(
      (await requestUpdateInstruction(lena.api, workspace.id, "Kurz antworten.")).status(),
    ).toBe(200);

    const thread = await createProjectThread(lena.api, workspace.id);
    const skill = await personalSkillOf(lena.api, `Protokoll ${suffix}`);
    expect(
      (await requestLinkItems(lena.api, "skills", workspace.id, [skill.id])).status(),
    ).toBe(204);
    expect(await linkedSkillIds(tobias.api, workspace.id)).toEqual([skill.id]);

    const removed = await requestRemoveMember(tobias.api, workspace.id, lena.id);
    expect(await removed.json()).toEqual({ unlinkedCount: 1 });
    expect(await accessLevelOf(lena.api, workspace.id)).toBe(404);
    expect(await linkedSkillIds(tobias.api, workspace.id)).toEqual([]);
    expect(await threadIdsOf(lena.api)).not.toContain(thread.id);

    await requestShare(tobias.api, workspace.id, { userIds: [lena.id], accessLevel: "use" });
    expect(await threadIdsOf(lena.api)).toContain(thread.id);
  } finally {
    await cleanUp(api, [tobias, lena]);
  }
});

test("the workspace list counts only the viewer's own chats", async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const suffix = `share-chats-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);

  try {
    const workspace = await workspaceOf(tobias.api, `Bauamt ${suffix}`);
    await requestShare(tobias.api, workspace.id, { userIds: [lena.id], accessLevel: "use" });
    await createProjectThread(tobias.api, workspace.id);
    await createProjectThread(tobias.api, workspace.id);
    await createProjectThread(lena.api, workspace.id);

    expect(await chatCountOf(tobias.api, workspace.id)).toBe(2);
    expect(await chatCountOf(lena.api, workspace.id)).toBe(1);
  } finally {
    await cleanUp(api, [tobias, lena]);
  }
});

test("a team share reaches current and later team members, and leaving the team removes their own links", async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const suffix = `share-team-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const jonas = await createSignedInMember(api, mail, `${suffix}-jonas`);
  const team = await createTeam(api, `Bauamt ${suffix}`);

  try {
    await addTeamMember(api, team.id, lena.id);
    const workspace = await workspaceOf(tobias.api, `Bauleitplanung ${suffix}`);
    const candidates = await (await requestShareCandidates(tobias.api, workspace.id)).json();
    expect(candidates.teams.map(({ teamId }: { teamId: string }) => teamId)).toContain(team.id);

    await requestShare(tobias.api, workspace.id, { teamIds: [team.id], accessLevel: "use" });
    expect(await accessLevelOf(lena.api, workspace.id)).toBe("use");
    expect(await accessLevelOf(jonas.api, workspace.id)).toBe(404);

    await addTeamMember(api, team.id, jonas.id);
    expect(await accessLevelOf(jonas.api, workspace.id)).toBe("use");

    await requestSetMemberAccess(tobias.api, workspace.id, lena.id, "edit", team.id);
    expect(await accessLevelOf(lena.api, workspace.id)).toBe("edit");
    const skill = await personalSkillOf(lena.api, `Antwort ${suffix}`);
    await requestLinkItems(lena.api, "skills", workspace.id, [skill.id]);
    expect(await linkedSkillIds(tobias.api, workspace.id)).toEqual([skill.id]);

    await removeTeamMember(api, team.id, lena.id);
    expect(await accessLevelOf(lena.api, workspace.id)).toBe(404);
    expect(await linkedSkillIds(tobias.api, workspace.id)).toEqual([]);

    const excluded = await requestRemoveMember(tobias.api, workspace.id, jonas.id, team.id);
    expect(excluded.status()).toBe(200);
    expect(await accessLevelOf(jonas.api, workspace.id)).toBe(404);
    const view = await (await requestSharing(tobias.api, workspace.id)).json();
    expect(view.teams).toEqual([]);
  } finally {
    await deleteTeam(api, team.id);
    await cleanUp(api, [tobias, lena, jonas]);
  }
});

test("ending a team share removes access through that team for current and later members", async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const suffix = `share-team-end-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const jonas = await createSignedInMember(api, mail, `${suffix}-jonas`);
  const sabine = await createSignedInMember(api, mail, `${suffix}-sabine`);
  const bauamt = await createTeam(api, `Bauamt ${suffix}`);
  const hauptamt = await createTeam(api, `Hauptamt ${suffix}`);

  try {
    await addTeamMember(api, bauamt.id, lena.id);
    await addTeamMember(api, bauamt.id, jonas.id);
    await addTeamMember(api, hauptamt.id, jonas.id);
    const workspace = await workspaceOf(tobias.api, `Bauleitplanung ${suffix}`);
    await requestShare(tobias.api, workspace.id, { teamIds: [bauamt.id, hauptamt.id], accessLevel: "edit" });
    const skill = await personalSkillOf(lena.api, `Antwort ${suffix}`);
    expect(
      (await requestLinkItems(lena.api, "skills", workspace.id, [skill.id])).status(),
    ).toBe(204);

    const view = await (await requestSharing(tobias.api, workspace.id)).json();
    expect(view.teams.map(({ canEnd }: { canEnd: boolean }) => canEnd)).toEqual([true, true]);
    expect((await requestEndTeamSharing(lena.api, workspace.id, bauamt.id)).status()).toBe(403);

    const ended = await requestEndTeamSharing(tobias.api, workspace.id, bauamt.id);
    expect(ended.status()).toBe(200);
    expect(await ended.json()).toEqual({ unlinkedCount: 1 });
    expect(await accessLevelOf(lena.api, workspace.id)).toBe(404);
    expect(await accessLevelOf(jonas.api, workspace.id)).toBe("edit");
    expect(await linkedSkillIds(tobias.api, workspace.id)).toEqual([]);

    await addTeamMember(api, bauamt.id, sabine.id);
    expect(await accessLevelOf(sabine.api, workspace.id)).toBe(404);
    expect((await requestEndTeamSharing(tobias.api, workspace.id, bauamt.id)).status()).toBe(404);
  } finally {
    await deleteTeam(api, bauamt.id);
    await deleteTeam(api, hauptamt.id);
    await cleanUp(api, [tobias, lena, jonas, sabine]);
  }
});

test("inviting a team again keeps its exclusions, and unknown people cannot be changed", async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const suffix = `share-again-${Date.now()}`;
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const jonas = await createSignedInMember(api, mail, `${suffix}-jonas`);
  const team = await createTeam(api, `Bauamt ${suffix}`);

  try {
    await addTeamMember(api, team.id, lena.id);
    await addTeamMember(api, team.id, jonas.id);
    const workspace = await workspaceOf(api, `Bauleitplanung ${suffix}`);
    await requestShare(api, workspace.id, { teamIds: [team.id], accessLevel: "use" });
    await requestRemoveMember(api, workspace.id, jonas.id, team.id);
    expect(await accessLevelOf(jonas.api, workspace.id)).toBe(404);

    expect(
      (await requestShare(api, workspace.id, { teamIds: [team.id], accessLevel: "edit" })).status(),
    ).toBe(201);
    expect(await accessLevelOf(jonas.api, workspace.id)).toBe(404);
    expect(await accessLevelOf(lena.api, workspace.id)).toBe("use");

    await requestOrganizationSharing(api, workspace.id, true);
    const unknown = "00000000-0000-4000-8000-000000000000";
    expect((await requestSetMemberAccess(api, workspace.id, unknown, "full")).status()).toBe(404);
    expect((await requestRemoveMember(api, workspace.id, unknown)).status()).toBe(404);
    await generatedApi.workspacesControllerRemove(workspace.id, { api });
  } finally {
    await deleteTeam(api, team.id);
    await cleanUp(api, [lena, jonas]);
  }
});

test("an organisation share reaches everyone, respects exclusions and ends cleanly", async ({
  api,
  mail,
}) => {
  test.setTimeout(150_000);
  const suffix = `share-org-${Date.now()}`;
  const tobias = await createSignedInMember(api, mail, `${suffix}-tobias`);
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const sabine = await createSignedInMember(api, mail, `${suffix}-sabine`);

  try {
    const own = await workspaceOf(tobias.api, `Ohne Recht ${suffix}`);
    expect((await requestOrganizationSharing(tobias.api, own.id, true)).status()).toBe(403);

    const workspace = await workspaceOf(api, `Gemeinderat ${suffix}`);
    expect((await requestOrganizationSharing(api, workspace.id, true)).status()).toBe(200);
    expect(await accessLevelOf(lena.api, workspace.id)).toBe("use");
    expect(await accessLevelOf(sabine.api, workspace.id)).toBe("use");

    await requestSetMemberAccess(api, workspace.id, sabine.id, "full");
    expect(await accessLevelOf(sabine.api, workspace.id)).toBe("full");

    await requestRemoveMember(api, workspace.id, lena.id);
    expect(await accessLevelOf(lena.api, workspace.id)).toBe(404);
    const candidates = await (await requestShareCandidates(api, workspace.id)).json();
    expect(candidates.people.map(({ userId }: { userId: string }) => userId)).toEqual([lena.id]);

    await requestShare(api, workspace.id, { userIds: [lena.id], accessLevel: "edit" });
    expect(await accessLevelOf(lena.api, workspace.id)).toBe("edit");

    await requestOrganizationSharing(api, workspace.id, false);
    expect(await accessLevelOf(tobias.api, workspace.id)).toBe(404);
    expect(await accessLevelOf(sabine.api, workspace.id)).toBe("full");
    expect(await accessLevelOf(lena.api, workspace.id)).toBe("edit");
    await generatedApi.workspacesControllerRemove(workspace.id, { api });
  } finally {
    await cleanUp(api, [tobias, lena, sabine]);
  }
});
