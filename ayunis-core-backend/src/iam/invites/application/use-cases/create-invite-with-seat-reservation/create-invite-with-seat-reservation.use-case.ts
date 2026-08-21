import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { CreateInviteCommand } from 'src/iam/invites/application/use-cases/create-invite/create-invite.command';
import { CreateInviteUseCase } from 'src/iam/invites/application/use-cases/create-invite/create-invite.use-case';

@Injectable()
export class CreateInviteWithSeatReservationUseCase {
  constructor(
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
    private readonly createInvite: CreateInviteUseCase,
  ) {}

  @Transactional()
  async execute(
    command: CreateInviteCommand,
  ): Promise<Awaited<ReturnType<CreateInviteUseCase['execute']>>> {
    await this.acquireAllocationLock.execute(command.orgId);
    return this.createInvite.execute(command);
  }
}
