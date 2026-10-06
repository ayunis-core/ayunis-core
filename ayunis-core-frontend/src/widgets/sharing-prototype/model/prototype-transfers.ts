import { canReviewTarget } from './access';
import { patchState, readState, transferKey } from './prototype-store';
import type {
  Person,
  ResourceKind,
  Role,
  TransferRequest,
  TransferTarget,
} from './types';

function isRequestFor(
  request: TransferRequest,
  resource: ResourceKind,
  itemId: string,
): boolean {
  return request.resource === resource && request.itemId === itemId;
}

function withoutRequest(resource: ResourceKind, itemId: string) {
  return readState().requests.filter(
    (request) => !isRequestFor(request, resource, itemId),
  );
}

export function requestFor(
  requests: TransferRequest[],
  resource: ResourceKind,
  itemId: string,
): TransferRequest | undefined {
  return requests.find((request) => isRequestFor(request, resource, itemId));
}

export function reviewableRequests(
  requests: TransferRequest[],
  resource: ResourceKind,
  person: Person,
  role: Role,
): TransferRequest[] {
  return requests.filter(
    (request) =>
      request.resource === resource &&
      canReviewTarget(request.target, person, role, resource),
  );
}

export function requestTransfer(request: TransferRequest) {
  patchState({
    requests: [...withoutRequest(request.resource, request.itemId), request],
  });
}

export function withdrawRequest(resource: ResourceKind, itemId: string) {
  patchState({ requests: withoutRequest(resource, itemId) });
}

export function transferDirectly(
  resource: ResourceKind,
  itemId: string,
  target: TransferTarget,
) {
  patchState({
    requests: withoutRequest(resource, itemId),
    transfers: {
      ...readState().transfers,
      [transferKey(resource, itemId)]: target,
    },
  });
}

export function approveRequest(resource: ResourceKind, itemId: string) {
  const request = requestFor(readState().requests, resource, itemId);
  if (!request) return;
  transferDirectly(resource, itemId, request.target);
}
