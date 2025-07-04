import { UUID } from 'crypto';

export class GetAllModelProviderInfosWithPermittedStatusQuery {
  constructor(public readonly orgId: UUID) {}
}
