import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  requestCreateSkill,
  requestDeleteSkill,
  requestGetSkill,
} from "../../src/clients/api/owned-resources.client";
import {
  requestLinkableItems,
  requestLinkedItems,
  requestLinkedWorkspaces,
  requestLinkItems,
  requestUnlinkItem,
} from "../../src/clients/api/workspace-links.client";
import { createProjectThread } from "../../src/factories/workspace-context.factory";
import { createSignedInMember } from "../../src/factories/user.factory";

interface Summary {
  id: string;
}

async function personalSkill(api: APIRequestContext, name: string) {
  return generatedApi.skillsControllerCreate(
    {
      ownerType: "personal",
      name,
      shortDescription: `${name} vorbereiten`,
      instructions: "Fasse die Besprechung in fünf Punkten zusammen.",
      isActive: false,
    },
    { api },
  );
}

async function workspaceOf(api: APIRequestContext, name: string) {
  return generatedApi.workspacesControllerCreate(
    { name, description: "", icon: "building-2" },
    { api },
  );
}

async function linkedSkillIds(api: APIRequestContext, workspaceId: string) {
  const response = await requestLinkedItems(api, "skills", workspaceId);
  const body = (await response.json()) as { data: { skill: Summary }[] };
  return body.data.map(({ skill }) => skill.id);
}

async function workspaceContext(api: APIRequestContext, threadId: string) {
  return generatedApi.threadAiContextControllerGetAiContext(threadId, { api });
}

test("a workspace owner links own and organisation items, uses them in workspace chats and unlinks them", async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const suffix = `links-${Date.now()}`;
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  let orgSkillId = "";

  try {
    orgSkillId = (
      (await (
        await requestCreateSkill(api, { ownerType: "org" }, `Datenschutz ${suffix}`)
      ).json()) as Summary
    ).id;
    const workspace = await workspaceOf(lena.api, `Haushalt ${suffix}`);
    const own = await personalSkill(lena.api, `Protokoll ${suffix}`);
    const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
      { ownerType: "personal", name: `Satzungen ${suffix}`, description: "" },
      { api: lena.api },
    );

    const linkable = (await (
      await requestLinkableItems(lena.api, "skills", workspace.id)
    ).json()) as Record<"own" | "team" | "org", Summary[]>;
    expect(linkable.own.map(({ id }) => id)).toContain(own.id);
    expect(linkable.org.map(({ id }) => id)).toContain(orgSkillId);

    for (let attempt = 0; attempt < 2; attempt++) {
      expect(
        (
          await requestLinkItems(lena.api, "skills", workspace.id, [
            own.id,
            orgSkillId,
          ])
        ).status(),
      ).toBe(204);
    }
    expect(
      (
        await requestLinkItems(lena.api, "knowledge-bases", workspace.id, [
          knowledgeBase.id,
        ])
      ).status(),
    ).toBe(204);

    const linked = (await (
      await requestLinkedItems(lena.api, "skills", workspace.id)
    ).json()) as { data: unknown[] };
    expect(linked.data).toHaveLength(2);
    expect(linked.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          skill: expect.objectContaining({
            id: own.id,
            owner: expect.objectContaining({ type: "personal", id: lena.id }),
          }),
          linkedBy: expect.objectContaining({ id: lena.id }),
        }),
        expect.objectContaining({
          skill: expect.objectContaining({
            id: orgSkillId,
            owner: expect.objectContaining({ type: "org", name: null }),
          }),
        }),
      ]),
    );
    const stillLinkable = (await (
      await requestLinkableItems(lena.api, "skills", workspace.id)
    ).json()) as Record<"own" | "org", Summary[]>;
    expect(stillLinkable.own.map(({ id }) => id)).not.toContain(own.id);

    const thread = await createProjectThread(lena.api, workspace.id);
    const context = await workspaceContext(lena.api, thread.id);
    expect(context.skills).toContainEqual(
      expect.objectContaining({ id: own.id, workspaceId: workspace.id }),
    );
    expect(context.knowledgeBases).toContainEqual(
      expect.objectContaining({
        id: knowledgeBase.id,
        workspaceId: workspace.id,
      }),
    );

    expect(
      await (await requestLinkedWorkspaces(lena.api, "skills", own.id)).json(),
    ).toMatchObject({
      total: 1,
      workspaces: [
        { id: workspace.id, linkedBy: expect.objectContaining({ id: lena.id }) },
      ],
    });

    expect(
      (
        await requestUnlinkItem(lena.api, "skills", workspace.id, own.id)
      ).status(),
    ).toBe(204);
    expect(await linkedSkillIds(lena.api, workspace.id)).toEqual([orgSkillId]);
    expect((await requestGetSkill(lena.api, own.id)).status()).toBe(200);
    expect(
      (await workspaceContext(lena.api, thread.id)).skills,
    ).not.toContainEqual(
      expect.objectContaining({ id: own.id, workspaceId: workspace.id }),
    );

    await generatedApi.workspacesControllerRemove(workspace.id, {
      api: lena.api,
    });
    expect(
      await (
        await requestLinkedWorkspaces(lena.api, "skills", orgSkillId)
      ).json(),
    ).toMatchObject({ total: 0, workspaces: [] });
    expect((await requestGetSkill(lena.api, orgSkillId)).status()).toBe(200);
  } finally {
    if (orgSkillId) await requestDeleteSkill(api, orgSkillId);
    await generatedApi.userControllerDeleteUser(lena.id, { api });
    await lena.api.dispose();
  }
});

test("nobody links another person’s personal items or links into a workspace they cannot edit", async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const suffix = `links-deny-${Date.now()}`;
  const lena = await createSignedInMember(api, mail, `${suffix}-lena`);
  const jonas = await createSignedInMember(api, mail, `${suffix}-jonas`);

  try {
    const lenaWorkspace = await workspaceOf(lena.api, `Haushalt ${suffix}`);
    const jonasWorkspace = await workspaceOf(jonas.api, `Bauamt ${suffix}`);
    const lenaSkill = await personalSkill(lena.api, `Protokoll ${suffix}`);
    const lenaOther = await personalSkill(lena.api, `Antwort ${suffix}`);
    const jonasSkill = await personalSkill(jonas.api, `Notiz ${suffix}`);

    expect(
      (
        await requestLinkItems(jonas.api, "skills", jonasWorkspace.id, [
          lenaSkill.id,
        ])
      ).status(),
    ).toBe(404);
    expect(await linkedSkillIds(jonas.api, jonasWorkspace.id)).toEqual([]);

    expect(
      (
        await requestLinkItems(lena.api, "skills", lenaWorkspace.id, [
          lenaOther.id,
          jonasSkill.id,
        ])
      ).status(),
    ).toBe(404);
    expect(await linkedSkillIds(lena.api, lenaWorkspace.id)).toEqual([]);

    expect(
      (
        await requestLinkItems(lena.api, "skills", lenaWorkspace.id, [
          lenaSkill.id,
        ])
      ).status(),
    ).toBe(204);
    for (const response of [
      await requestLinkedItems(jonas.api, "skills", lenaWorkspace.id),
      await requestLinkableItems(jonas.api, "skills", lenaWorkspace.id),
      await requestLinkItems(jonas.api, "skills", lenaWorkspace.id, [
        jonasSkill.id,
      ]),
      await requestUnlinkItem(
        jonas.api,
        "skills",
        lenaWorkspace.id,
        lenaSkill.id,
      ),
      await requestGetSkill(jonas.api, lenaSkill.id),
      await requestLinkedWorkspaces(jonas.api, "skills", lenaSkill.id),
    ]) {
      expect(response.status()).toBe(404);
    }
    expect(await linkedSkillIds(lena.api, lenaWorkspace.id)).toEqual([
      lenaSkill.id,
    ]);

    const workspaceSkill = await generatedApi.skillsControllerCreate(
      {
        ownerType: "workspace",
        workspaceId: lenaWorkspace.id,
        name: `Arbeitsbereich ${suffix}`,
        shortDescription: "Gehört dem Arbeitsbereich",
        instructions: "Nur hier.",
      },
      { api: lena.api },
    );
    const notLinkable = await requestLinkItems(
      lena.api,
      "skills",
      lenaWorkspace.id,
      [workspaceSkill.id],
    );
    expect(notLinkable.status()).toBe(400);
    expect(await notLinkable.json()).toMatchObject({
      code: "SKILL_NOT_LINKABLE",
    });
  } finally {
    for (const member of [lena, jonas]) {
      await generatedApi.userControllerDeleteUser(member.id, { api });
      await member.api.dispose();
    }
  }
});
