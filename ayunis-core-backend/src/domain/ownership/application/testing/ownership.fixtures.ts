import { OwnershipLookup } from 'src/domain/ownership/application/models/ownership-lookup';
import type { OwnedResourceKind } from 'src/domain/ownership/application/models/owned-resource-kind';
import {
  OwnershipViewer,
  type OwnershipViewerParams,
} from 'src/domain/ownership/application/models/ownership-viewer';

export function anOwnershipViewer(
  params: Pick<OwnershipViewerParams, 'userId' | 'orgId'> &
    Partial<OwnershipViewerParams>,
): OwnershipViewer {
  return new OwnershipViewer({
    isAdmin: false,
    permissions: [],
    memberTeamIds: [],
    adminTeamIds: [],
    teamAdminPermissions: [],
    ...params,
  });
}

export function anOwnershipLookup(
  kind: OwnedResourceKind,
  viewer: OwnershipViewer,
): OwnershipLookup {
  return new OwnershipLookup(kind, viewer, { teams: new Map(), org: null });
}
