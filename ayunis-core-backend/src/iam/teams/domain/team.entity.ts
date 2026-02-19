import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class Team {
  public id: UUID;
  public name: string;
  public orgId: UUID;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    orgId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.orgId = params.orgId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
