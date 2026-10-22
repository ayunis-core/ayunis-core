jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (
      _target: object,
      _propertyName: string | symbol,
      descriptor: PropertyDescriptor,
    ) =>
      descriptor,
}));

import { randomUUID, type UUID } from 'crypto';
import { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import {
  aWorkspace,
  createMockWorkspacesRepository,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import { WorkspaceOwnershipService } from './workspace-ownership.service';

const tobias = randomUUID();
const lena = randomUUID();
const jonas = randomUUID();
const sabine = randomUUID();
const anna = randomUUID();
const bauamt = randomUUID();

const directory = new OrgDirectory(
  [
    { id: tobias, name: 'Tobias', teams: [] },
    { id: lena, name: 'Lena', teams: [{ id: bauamt, name: 'Bauamt' }] },
    { id: jonas, name: 'Jonas', teams: [{ id: bauamt, name: 'Bauamt' }] },
    { id: sabine, name: 'Sabine', teams: [] },
    { id: anna, name: 'Anna', teams: [] },
  ],
  [{ id: bauamt, name: 'Bauamt' }],
);

function setup() {
  const sharingRepository = {
    save: jest.fn().mockResolvedValue(undefined),
    loadMany: jest.fn(),
  };
  const workspaces = createMockWorkspacesRepository();
  const sharing = new WorkspaceSharing({
    workspaceId: randomUUID(),
    ownerId: tobias,
  });
  return {
    sharing,
    sharingRepository,
    workspaces,
    service: new WorkspaceOwnershipService(sharingRepository, workspaces),
  };
}

function invite(
  sharing: WorkspaceSharing,
  params: {
    userIds?: UUID[];
    teamIds?: UUID[];
    level: 'use' | 'edit' | 'full';
  },
) {
  sharing.invite(
    {
      userIds: params.userIds ?? [],
      teamIds: params.teamIds ?? [],
      level: params.level,
      at: new Date(),
    },
    directory,
  );
}

describe(WorkspaceOwnershipService.name, () => {
  it('offers everyone with access except the owner, by name', () => {
    const { service, sharing } = setup();
    invite(sharing, { userIds: [sabine], level: 'use' });
    invite(sharing, { teamIds: [bauamt], level: 'use' });
    sharing.remove(jonas, { type: 'team', teamId: bauamt }, directory);

    expect(
      service.candidatesOf(sharing, directory).map(({ name }) => name),
    ).toEqual(['Lena', 'Sabine']);
  });

  it('offers everyone of the organisation except excluded people', () => {
    const { service, sharing } = setup();
    sharing.setSharedWithOrganization(true);
    sharing.remove(anna, { type: 'organization' }, directory);

    expect(
      service.candidatesOf(sharing, directory).map(({ name }) => name),
    ).toEqual(['Jonas', 'Lena', 'Sabine']);
  });

  it('counts team members as invited', () => {
    const { service, sharing } = setup();
    sharing.setSharedWithOrganization(true);
    invite(sharing, { teamIds: [bauamt], level: 'use' });

    expect(service.successorOf(sharing, directory)).toBe(jonas);
  });

  it('picks the person with the highest level as successor', () => {
    const { service, sharing } = setup();
    invite(sharing, { userIds: [sabine], level: 'edit' });
    invite(sharing, { userIds: [anna], level: 'full' });

    expect(service.successorOf(sharing, directory)).toBe(anna);
  });

  it('prefers invited people over the organisation at the same level', () => {
    const { service, sharing } = setup();
    invite(sharing, { userIds: [sabine], level: 'use' });
    sharing.setSharedWithOrganization(true);

    expect(service.successorOf(sharing, directory)).toBe(sabine);
  });

  it('finds no successor when nobody else has access', () => {
    const { service, sharing } = setup();

    expect(service.successorOf(sharing, directory)).toBeNull();
  });

  it('locks the workspace, writes the new owner and saves the sharing', async () => {
    const { service, sharing, sharingRepository, workspaces } = setup();
    invite(sharing, { userIds: [sabine], level: 'edit' });
    const order: string[] = [];
    workspaces.lockForUpdate.mockImplementation(() => {
      order.push('lock');
      return Promise.resolve();
    });
    workspaces.changeOwner.mockImplementation(() => {
      order.push('owner');
      return Promise.resolve();
    });

    await service.transfer(sharing, sabine, directory);

    expect(order).toEqual(['lock', 'owner']);
    expect(workspaces.changeOwner).toHaveBeenCalledWith(
      sharing.workspaceId,
      sabine,
    );
    expect(sharing.ownerId).toBe(sabine);
    expect(sharing.people.get(tobias)).toBe('full');
    expect(sharingRepository.save).toHaveBeenCalledWith(sharing);
  });

  it('hands a departing owner’s workspace over only after locking and re-reading it', async () => {
    const { service, sharing, sharingRepository, workspaces } = setup();
    invite(sharing, { userIds: [lena], level: 'use' });
    invite(sharing, { userIds: [sabine], level: 'full' });
    const workspace = aWorkspace({ id: sharing.workspaceId, userId: tobias });
    const order: string[] = [];
    workspaces.lockForUpdate.mockImplementation(() => {
      order.push('lock');
      return Promise.resolve();
    });
    workspaces.findOne.mockImplementation(() => {
      order.push('read');
      return Promise.resolve(workspace);
    });
    sharingRepository.loadMany.mockResolvedValue(
      new Map([[sharing.workspaceId, sharing]]),
    );

    const outcome = await service.handOverFrom(
      sharing.workspaceId,
      tobias,
      directory,
    );

    expect(order).toEqual(['lock', 'read']);
    expect(outcome).toEqual({ type: 'handed-over', successorId: sabine });
    expect(workspaces.changeOwner).toHaveBeenCalledWith(
      sharing.workspaceId,
      sabine,
    );
    expect(sharingRepository.save).toHaveBeenCalledWith(sharing);
  });

  it('reports a workspace nobody else uses and changes nothing', async () => {
    const { service, sharing, sharingRepository, workspaces } = setup();
    const workspace = aWorkspace({ id: sharing.workspaceId, userId: tobias });
    workspaces.findOne.mockResolvedValue(workspace);
    sharingRepository.loadMany.mockResolvedValue(
      new Map([[sharing.workspaceId, sharing]]),
    );

    await expect(
      service.handOverFrom(sharing.workspaceId, tobias, directory),
    ).resolves.toEqual({ type: 'stays-alone', workspace });
    expect(sharingRepository.save).not.toHaveBeenCalled();
  });

  it('skips a workspace that no longer belongs to the departing owner', async () => {
    const { service, sharing, sharingRepository, workspaces } = setup();
    workspaces.findOne.mockResolvedValue(
      aWorkspace({ id: sharing.workspaceId, userId: sabine }),
    );

    await expect(
      service.handOverFrom(sharing.workspaceId, tobias, directory),
    ).resolves.toEqual({ type: 'not-owned' });
    expect(sharingRepository.loadMany).not.toHaveBeenCalled();
    expect(workspaces.changeOwner).not.toHaveBeenCalled();
  });
});
