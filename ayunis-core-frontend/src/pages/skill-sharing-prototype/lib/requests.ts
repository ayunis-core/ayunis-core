import { showSuccess } from '@/shared/lib/toast';
import {
  findPerson,
  targetOwnerLabel,
} from '@/widgets/sharing-prototype/model/access';
import {
  approveRequest,
  withdrawRequest,
} from '@/widgets/sharing-prototype/model/prototype-transfers';
import type {
  ResourceKind,
  TransferRequest,
} from '@/widgets/sharing-prototype/model/types';

export {
  requestFor,
  reviewableRequests,
} from '@/widgets/sharing-prototype/model/prototype-transfers';

export const RESOURCE_NOUN: Record<ResourceKind, string> = {
  skill: 'Fähigkeit',
  knowledge: 'Wissenssammlung',
};

export function approveTransferRequest(
  request: TransferRequest,
  itemName: string,
) {
  approveRequest(request.resource, request.itemId);
  showSuccess(
    `Freigegeben. „${itemName}“ gehört jetzt ${targetOwnerLabel(request.target)}.`,
  );
}

export function rejectTransferRequest(
  request: TransferRequest,
  itemName: string,
) {
  withdrawRequest(request.resource, request.itemId);
  showSuccess(
    `Abgelehnt. „${itemName}“ bleibt bei ${findPerson(request.requestedBy).name}.`,
  );
}
