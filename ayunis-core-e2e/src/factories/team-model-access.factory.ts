import type { APIRequestContext } from '@playwright/test';
import { generatedApi } from '../clients/api/generated-api';
import {
  getConfiguredImageCandidates,
  getConfiguredLanguageCandidates,
  getEffectiveLanguageModels,
} from '../clients/api/models.client';
import { addTeamMember, createTeam, deleteTeam } from '../clients/api/teams.client';
import type { MailcatcherClient } from '../clients/mailcatcher.client';
import { createSignedInMember } from './user.factory';
import type { SignedInMember } from './user.factory';
import type {
  ModelWithConfigResponseDto,
  PermittedLanguageModelResponseDto,
  TeamResponseDto,
} from '../clients/generated/ayunisCoreAPI.schemas';

export interface TeamModelAccessFixture {
  team: TeamResponseDto;
  member: SignedInMember;
  nonMember: SignedInMember;
  orgModel: PermittedLanguageModelResponseDto;
  teamOnlyModel: ModelWithConfigResponseDto;
  imageModel: ModelWithConfigResponseDto;
  cleanup: () => Promise<void>;
}

async function findTeamOnlyCandidate(
  api: APIRequestContext,
): Promise<ModelWithConfigResponseDto> {
  const candidate = (await getConfiguredLanguageCandidates(api)).find(
    (model) => !model.isPermitted,
  );
  if (!candidate) {
    throw new Error('No configured organization-unpermitted language candidate');
  }
  return candidate;
}

async function findImageCandidate(
  api: APIRequestContext,
): Promise<ModelWithConfigResponseDto> {
  const candidate = (await getConfiguredImageCandidates(api))[0];
  if (!candidate) {
    throw new Error(
      'No configured image candidate; start the stack with AZURE_OPENAI_API_KEY=e2e-dummy',
    );
  }
  return candidate;
}

export async function createTeamModelAccessFixture(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  suffix: string,
): Promise<TeamModelAccessFixture> {
  const orgModel = (await getEffectiveLanguageModels(adminApi))[0];
  if (!orgModel) throw new Error('Worker organization has no default model');

  const teamOnlyModel = await findTeamOnlyCandidate(adminApi);
  const imageModel = await findImageCandidate(adminApi);
  const member = await createSignedInMember(adminApi, mail, `${suffix}-member`);
  const nonMember = await createSignedInMember(
    adminApi,
    mail,
    `${suffix}-non-member`,
  );
  const team = await createTeam(adminApi, `Model Access ${suffix}`);
  await addTeamMember(adminApi, team.id, member.id);

  const cleanup = async (): Promise<void> => {
    try {
      await deleteTeam(adminApi, team.id);
      await generatedApi.userControllerDeleteUser(member.id, { api: adminApi });
      await generatedApi.userControllerDeleteUser(nonMember.id, {
        api: adminApi,
      });
    } finally {
      await member.api.dispose();
      await nonMember.api.dispose();
    }
  };

  return {
    team,
    member,
    nonMember,
    orgModel,
    teamOnlyModel,
    imageModel,
    cleanup,
  };
}
