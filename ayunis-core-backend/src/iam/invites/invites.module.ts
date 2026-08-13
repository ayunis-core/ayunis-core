import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtConfigModule } from '../authentication/jwt.module';

// Entities and Infrastructure
import { InviteRecord } from './infrastructure/persistence/local/schema/invite.record';
import { InviteMapper } from './infrastructure/persistence/local/mappers/invite.mapper';
import { LocalInvitesRepository } from './infrastructure/persistence/local/local-invites.repository';

// Ports
import { InvitesRepository } from './application/ports/invites.repository';

// Services
import { InviteJwtService } from './application/services/invite-jwt.service';

// Use Cases
import { CreateInviteUseCase } from './application/use-cases/create-invite/create-invite.use-case';
import { CreateBulkInvitesUseCase } from './application/use-cases/create-bulk-invites/create-bulk-invites.use-case';
import { AcceptInviteUseCase } from './application/use-cases/accept-invite/accept-invite.use-case';
import { DeleteInviteUseCase } from './application/use-cases/delete-invite/delete-invite.use-case';
import { GetInvitesByOrgUseCase } from './application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { GetInviteByTokenUseCase } from './application/use-cases/get-invite-by-token/get-invite-by-token.use-case';
import { SendInvitationEmailUseCase } from './application/use-cases/send-invitation-email/send-invitation-email.use-case';
import { DeleteInviteByEmailUseCase } from './application/use-cases/delete-invite-by-email/delete-invite-by-email.use-case';
import { DeleteAllPendingInvitesUseCase } from './application/use-cases/delete-all-pending-invites/delete-all-pending-invites.use-case';
import { ResendExpiredInviteUseCase } from './application/use-cases/resend-expired-invite/resend-expired-invite.use-case';
import { PendingInviteCountsRepository } from 'src/iam/invites/application/ports/pending-invite-counts.repository';
import { LocalPendingInviteCountsRepository } from 'src/iam/invites/infrastructure/persistence/local/local-pending-invite-counts.repository';
import { CountPendingInvitesByOrgIdUseCase } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.use-case';
import { CreateInviteWithSeatReservationUseCase } from 'src/iam/invites/application/use-cases/create-invite-with-seat-reservation/create-invite-with-seat-reservation.use-case';
import { BulkInviteDeliveryService } from 'src/iam/invites/application/services/bulk-invite-delivery.service';
import { BulkInviteValidatorService } from 'src/iam/invites/application/services/bulk-invite-validator.service';
import { FindPendingInviteByEmailAndOrgUseCase } from 'src/iam/invites/application/use-cases/find-pending-invite-by-email-and-org/find-pending-invite-by-email-and-org.use-case';
import { AcceptPendingInviteUseCase } from 'src/iam/invites/application/use-cases/accept-pending-invite/accept-pending-invite.use-case';

// Presenters
import { InvitesController } from './presenters/http/invites.controller';
import { InviteResponseMapper } from './presenters/http/mappers/invite-response.mapper';

// External modules
import { OrgsModule } from '../orgs/orgs.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmailsModule } from '../../common/emails/emails.module';
import { EmailTemplatesModule } from '../../common/email-templates/email-templates.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([InviteRecord]),
    JwtConfigModule,
    OrgsModule,
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => UsersModule),
    EmailsModule,
    EmailTemplatesModule,
  ],
  providers: [
    // Mappers
    InviteMapper,
    InviteResponseMapper,

    // Repository
    {
      provide: InvitesRepository,
      useClass: LocalInvitesRepository,
    },
    {
      provide: PendingInviteCountsRepository,
      useClass: LocalPendingInviteCountsRepository,
    },

    // Services
    InviteJwtService,

    // Use Cases
    CreateInviteUseCase,
    CreateBulkInvitesUseCase,
    AcceptInviteUseCase,
    DeleteInviteUseCase,
    DeleteAllPendingInvitesUseCase,
    ResendExpiredInviteUseCase,
    CountPendingInvitesByOrgIdUseCase,
    CreateInviteWithSeatReservationUseCase,
    BulkInviteDeliveryService,
    BulkInviteValidatorService,
    FindPendingInviteByEmailAndOrgUseCase,
    AcceptPendingInviteUseCase,
    GetInvitesByOrgUseCase,
    GetInviteByTokenUseCase,
    SendInvitationEmailUseCase,
    DeleteInviteByEmailUseCase,
  ],
  controllers: [InvitesController],
  exports: [
    InvitesRepository, // Export repository for CLI user management
    CreateInviteUseCase,
    AcceptInviteUseCase,
    DeleteInviteUseCase,
    GetInvitesByOrgUseCase,
    GetInviteByTokenUseCase,
    SendInvitationEmailUseCase,
    InviteJwtService,
    DeleteInviteByEmailUseCase,
    CountPendingInvitesByOrgIdUseCase,
    FindPendingInviteByEmailAndOrgUseCase,
    AcceptPendingInviteUseCase,
  ],
})
export class InvitesModule {}
