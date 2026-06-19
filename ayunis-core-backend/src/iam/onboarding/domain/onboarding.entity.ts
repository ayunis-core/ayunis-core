import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class Onboarding {
  id: UUID;
  userId: UUID;
  completedStepIds: string[];
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    completedStepIds?: string[];
    hidden?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.completedStepIds = params.completedStepIds ?? [];
    this.hidden = params.hidden ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
