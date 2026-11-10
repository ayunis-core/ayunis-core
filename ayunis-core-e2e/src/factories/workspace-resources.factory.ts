import type { APIRequestContext } from "@playwright/test";
import { generatedApi } from "../clients/api/generated-api";

export interface OwnedWorkspace {
  id: string;
  skillId: string;
  knowledgeBaseId: string;
}

/** A workspace with one skill and one knowledge base, created by `api`. */
export async function createWorkspaceWithResources(
  api: APIRequestContext,
  name: string,
): Promise<OwnedWorkspace> {
  const workspace = await generatedApi.workspacesControllerCreate(
    { name, icon: "building-2" },
    { api },
  );
  const skill = await generatedApi.skillsControllerCreate(
    {
      ownerType: "workspace",
      workspaceId: workspace.id,
      name: `Haushaltsplan prüfen ${name}`,
      shortDescription: "Prüft Haushaltsansätze gegen die Vorjahreswerte",
      instructions: "Vergleiche jeden Haushaltsansatz mit dem Vorjahr.",
    },
    { api },
  );
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      ownerType: "workspace",
      workspaceId: workspace.id,
      name: `Haushaltssatzung ${name}`,
      description: "Satzung und Erläuterungen zum Haushalt",
    },
    { api },
  );
  return {
    id: workspace.id,
    skillId: skill.id,
    knowledgeBaseId: knowledgeBase.id,
  };
}
