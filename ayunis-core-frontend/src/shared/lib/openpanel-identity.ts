import type { MeResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { OpenPanel } from '@openpanel/web';
import type { OpenPanelGlobalProperties } from './openpanel-events';
import { openPanel } from './openpanel';

type OpenPanelUser = Pick<
  MeResponseDto,
  'id' | 'orgId' | 'role' | 'systemRole'
>;

/** `clear()` keeps global properties; undefined ones are dropped from sent events. */
const unsetGlobalProperties: Record<
  keyof OpenPanelGlobalProperties,
  undefined
> = {
  role: undefined,
  system_role: undefined,
  onboarding_stage: undefined,
};

let identified: { userId: string; orgId: string } | undefined;

/**
 * Pseudonymous identity only: the user UUID is the profile and the org UUID
 * is both group ID and group name. Names and emails are never sent.
 * Runs on every authenticated navigation, so the profile and group are sent
 * once per identity; a different user first clears the previous one.
 * Like `trackOpenPanelEvent`, SDK failures never reach the caller.
 */
export function identifyOpenPanelUser(user: OpenPanelUser): void {
  if (!openPanel) return;
  sendIdentity(openPanel, user).catch(() => undefined);
}

/** The next person on the same browser starts a new anonymous profile. */
export function clearOpenPanelIdentity(): void {
  const client = openPanel;
  if (!client) return;
  ignoreFailures(() => resetIdentity(client));
}

/**
 * `userId` is the user the stage was derived for; a stage for anyone but the
 * identified user is dropped, so it can never be attributed to another profile.
 */
export function setOpenPanelOnboardingStage(
  userId: string,
  stage: OpenPanelGlobalProperties['onboarding_stage'],
): void {
  const client = openPanel;
  if (!client || identified?.userId !== userId) return;
  ignoreFailures(() =>
    client.setGlobalProperties({
      onboarding_stage: stage,
    } satisfies Partial<OpenPanelGlobalProperties>),
  );
}

async function sendIdentity(
  client: OpenPanel,
  user: OpenPanelUser,
): Promise<void> {
  const isSameIdentity =
    identified?.userId === user.id && identified.orgId === user.orgId;
  if (identified && !isSameIdentity) resetIdentity(client);
  client.setGlobalProperties({
    role: user.role,
    system_role: user.systemRole,
  } satisfies Partial<OpenPanelGlobalProperties>);
  if (isSameIdentity) return;
  identified = { userId: user.id, orgId: user.orgId };
  await Promise.all([
    client.identify({ profileId: user.id }),
    client.upsertGroup({
      id: user.orgId,
      type: 'organization',
      name: user.orgId,
    }),
    client.setGroup(user.orgId),
  ]);
}

function resetIdentity(client: OpenPanel): void {
  identified = undefined;
  client.clear();
  client.setGlobalProperties(unsetGlobalProperties);
}

function ignoreFailures(action: () => void): void {
  try {
    action();
  } catch {
    return;
  }
}
