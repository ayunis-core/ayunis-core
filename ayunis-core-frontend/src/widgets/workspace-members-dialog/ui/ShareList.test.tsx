import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  SharingTeamDto,
  WorkspaceSharingResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ShareList } from './ShareList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

function aTeam(canEnd: boolean): SharingTeamDto {
  return {
    teamId: 'bauamt',
    name: 'Bauamt',
    accessLevel: 'use',
    memberCount: 2,
    members: [],
    canEnd,
  };
}

function renderList(team: SharingTeamDto, onEndTeamSharing = vi.fn()) {
  const sharing = {
    isSharedWithOrganization: true,
    memberCount: 3,
    owner: {
      userId: 'tobias',
      name: 'Tobias',
      affiliation: null,
      accessLevel: 'owner',
      isOwner: true,
      canChange: false,
    },
    people: [],
    teams: [team],
    organization: null,
  } as unknown as WorkspaceSharingResponseDto;
  render(
    <ShareList
      sharing={sharing}
      handlers={{ viewerId: 'tobias', onSetAccess: vi.fn(), onRemove: vi.fn() }}
      onEndTeamSharing={onEndTeamSharing}
    />,
  );
  return onEndTeamSharing;
}

describe('ShareList team section', () => {
  it('lets people who may end the team share do so', () => {
    const team = aTeam(true);
    const onEnd = renderList(team);

    fireEvent.click(screen.getByTestId('end-team-sharing-bauamt'));

    expect(onEnd).toHaveBeenCalledWith(team);
  });

  it('hides the action from everyone else', () => {
    renderList(aTeam(false));

    expect(screen.queryByTestId('end-team-sharing-bauamt')).toBeNull();
  });
});
