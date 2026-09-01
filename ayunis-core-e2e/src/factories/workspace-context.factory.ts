import type { APIRequestContext } from "@playwright/test";
import { generatedApi } from "../clients/api/generated-api";

export interface ProjectContextFixture {
  workspace: { id: string; name: string };
  skill: { id: string; name: string };
  knowledgeBase: { id: string; name: string };
  instruction: string;
  knowledgeDocumentName: string;
  workspaceDocument: { id: string; name: string } | null;
  workspaceDocumentName: string;
}

interface ProjectContextOptions {
  attach?: boolean;
  includeDocuments?: boolean;
}

export async function createProjectThread(
  api: APIRequestContext,
  workspaceId: string,
): Promise<{ id: string }> {
  const model =
    await generatedApi.modelsDefaultsControllerGetEffectiveDefaultModel({
      api,
    });
  const permittedLanguageModel = model.permittedLanguageModel;
  if (!permittedLanguageModel) {
    throw new Error(
      "No default language model configured for project context test",
    );
  }
  return generatedApi.threadsControllerCreate(
    { workspaceId, modelId: permittedLanguageModel.id },
    { api },
  );
}

export async function createProjectContextFixture(
  api: APIRequestContext,
  suffix: string,
  options: ProjectContextOptions = {},
): Promise<ProjectContextFixture> {
  const workspace = await generatedApi.workspacesControllerCreate(
    {
      name: `Projekt ${suffix}`,
      description: "Projektkontext für Bauanträge und Satzungen",
      icon: "building-2",
    },
    { api },
  );
  const personalSkill = await generatedApi.skillsControllerCreate(
    {
      name: `Bauanträge prüfen ${suffix}`,
      shortDescription: "Prüft Bauanträge gegen lokale Vorgaben",
      instructions:
        "Prüfe Bauanträge anhand der Projektvorgaben und nenne offene Punkte.",
      isActive: true,
    },
    { api },
  );
  const personalKnowledgeBase =
    await generatedApi.knowledgeBasesControllerCreate(
    {
      name: `Bauordnung Wissen ${suffix}`,
      description: "Lokale Bauordnung und Stellplatzsatzung für das Projekt",
    },
    { api },
  );
  let skill: { id: string; name: string } = personalSkill;
  let knowledgeBase: { id: string; name: string } = personalKnowledgeBase;
  const instruction = `Antworte für ${suffix} mit kurzer Prüfung, Risiko und nächstem Schritt.`;
  const knowledgeDocumentName = `Bauordnung ${suffix}.txt`;
  const workspaceDocumentName = `Stellplatzsatzung ${suffix}.txt`;

  let workspaceDocument: { id: string; name: string } | null = null;

  if (options.attach) {
    if (options.includeDocuments && (await permitFirstEmbeddingModel(api))) {
      workspaceDocument = await uploadProjectContextDocuments(api, {
        workspaceId: workspace.id,
        knowledgeBaseId: knowledgeBase.id,
        knowledgeDocumentName,
        workspaceDocumentName,
      });
    }
    skill = await generatedApi.workspaceContextControllerCopyPersonalSkill(
      workspace.id,
      { skillId: skill.id },
      { api },
    );
    knowledgeBase =
      await generatedApi.workspaceContextControllerCopyPersonalKnowledgeBase(
        workspace.id,
        { knowledgeBaseId: knowledgeBase.id },
        { api },
      );
    await generatedApi.workspaceContextControllerUpdateInstruction(
      workspace.id,
      { instruction },
      { api },
    );
  }

  return {
    workspace,
    skill,
    knowledgeBase,
    instruction,
    knowledgeDocumentName,
    workspaceDocument,
    workspaceDocumentName,
  };
}

export async function permitFirstEmbeddingModel(
  api: APIRequestContext,
): Promise<boolean> {
  const models = await generatedApi.modelsControllerGetAvailableEmbeddingModels(
    {
      api,
    },
  );
  const model = models[0];
  if (!model) return false;
  if (model.permittedModelId) return true;
  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: model.modelId },
    { api },
  );
  return true;
}

async function uploadProjectContextDocuments(
  api: APIRequestContext,
  context: {
    workspaceId: string;
    knowledgeBaseId: string;
    knowledgeDocumentName: string;
    workspaceDocumentName: string;
  },
): Promise<{ id: string; name: string }> {
  await uploadTextFile(
    api,
    `/api/knowledge-bases/${context.knowledgeBaseId}/documents`,
    context.knowledgeDocumentName,
    "Abstandsflächen, Brandschutz und Nachbarbeteiligung sind zu prüfen.",
  );
  return uploadTextFile(
    api,
    `/api/workspaces/${context.workspaceId}/context/documents`,
    context.workspaceDocumentName,
    "Je Wohneinheit ist mindestens ein Stellplatz nachzuweisen.",
  );
}

async function uploadTextFile(
  api: APIRequestContext,
  path: string,
  name: string,
  content: string,
): Promise<{ id: string; name: string }> {
  const response = await api.post(path, {
    multipart: {
      file: {
        name,
        mimeType: "text/plain",
        buffer: Buffer.from(content),
      },
    },
  });
  if (!response.ok()) {
    throw new Error(
      `POST ${path} failed (HTTP ${response.status()}): ${await response.text()}`,
    );
  }
  return response.json() as Promise<{ id: string; name: string }>;
}
