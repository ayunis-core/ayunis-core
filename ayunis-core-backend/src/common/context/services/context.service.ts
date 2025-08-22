import { UUID } from 'crypto';
import { ClsService, ClsStore } from 'nestjs-cls';

export interface MyClsStore extends ClsStore {
  userId?: UUID;
  orgId?: UUID;
}

export class ContextService extends ClsService<MyClsStore> {}
