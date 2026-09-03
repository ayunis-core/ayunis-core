import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { CreateInviteCommand } from 'src/iam/invites/application/use-cases/create-invite/create-invite.command';
import { CreateInviteUseCase } from 'src/iam/invites/application/use-cases/create-invite/create-invite.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import {
  UnauthorizedInviteAccessError,
  UnexpectedInviteError,
} from 'src/iam/invites/application/invites.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class CreateInviteWithSeatReservationUseCase {
  constructor(
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
    private readonly createInvite: CreateInviteUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedInviteError)
  @Transactional()
  async execute(
    command: CreateInviteCommand,
  ): Promise<Awaited<ReturnType<CreateInviteUseCase['execute']>>> {
    this.assertTenantAdmin(command);
    await this.acquireAllocationLock.execute(command.orgId);
    return this.createInvite.execute(command);
  }

  private assertTenantAdmin(command: CreateInviteCommand): void {
    const role = this.contextService.get('role');
    const orgId = this.contextService.get('orgId');
    if (role !== UserRole.ADMIN || orgId !== command.orgId) {
      throw new UnauthorizedInviteAccessError({
        requestingUserId: command.userId,
        requestedOrgId: command.orgId,
      });
    }
  }
}
