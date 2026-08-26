import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { config } from '../config';
import { acceptInvite, inviteUser } from '../clients/api/invites.client';
import { login } from '../clients/api/auth.client';
import { skipChatPersonalization } from '../clients/api/chat-settings.client';
import { generatedApi } from '../clients/api/generated-api';
import { dismissWelcomeVideo } from '../clients/api/onboarding.client';
import { createOrgSkillShare } from '../clients/api/shares.client';
import type { MailcatcherClient } from '../clients/mailcatcher.client';

const MEMBER_PASSWORD = 'E2e-Password-1';

export interface SharedSkillAccessFixture {
  skill: { id: string; name: string };
  knowledgeBase: { id: string; name: string };
  workspace: { id: string; name: string };
  memberApi: APIRequestContext;
  shareSkill: () => Promise<void>;
}

export async function createSharedSkillAccessFixture(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  suffix: string,
): Promise<SharedSkillAccessFixture> {
  const skill = await generatedApi.skillsControllerCreate(
    {
      name: `Shared civic knowledge ${suffix}`,
      shortDescription: 'Provides shared civic knowledge for organization members',
      instructions: 'Use the linked civic knowledge base for relevant questions.',
      isActive: true,
    },
    { api: adminApi },
  );
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      name: `Shared civic knowledge base ${suffix}`,
      description: 'Knowledge base shared through a skill',
    },
    { api: adminApi },
  );
  await generatedApi.skillKnowledgeBasesControllerAssignKnowledgeBase(
    skill.id,
    knowledgeBase.id,
    { api: adminApi },
  );

  const memberEmail = `e2e-shared-skill-${suffix}@e2e.local`;
  await inviteUser(adminApi, memberEmail);
  const inviteToken = await mail.extractLinkToken(
    memberEmail,
    '/accept-invite',
  );
  const memberApi = await request.newContext({ baseURL: config.apiURL });

  try {
    await acceptInvite(memberApi, {
      inviteToken,
      userName: `Shared Skill Viewer ${suffix}`,
      password: MEMBER_PASSWORD,
      hasAcceptedMarketing: false,
    });
    await login(memberApi, memberEmail, MEMBER_PASSWORD);
    await dismissWelcomeVideo(memberApi);
    await skipChatPersonalization(memberApi);
    const workspace = await generatedApi.workspacesControllerCreate(
      {
        name: `Shared skill workspace ${suffix}`,
        description: 'Workspace for shared skill access coverage',
        icon: 'building-2',
      },
      { api: memberApi },
    );
    const shareSkill = async (): Promise<void> => {
      await createOrgSkillShare(adminApi, skill.id);
    };

    return {
      skill: { id: skill.id, name: skill.name },
      knowledgeBase: {
        id: knowledgeBase.id,
        name: knowledgeBase.name,
      },
      workspace: { id: workspace.id, name: workspace.name },
      memberApi,
      shareSkill,
    };
  } catch (error) {
    await memberApi.dispose();
    throw error;
  }
}
