import { ExportAdminUsersUseCase } from './export-admin-users.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';
import type { AdminUsersExportRepository } from '../../ports/admin-users-export.repository';

describe('ExportAdminUsersUseCase', () => {
  it('should export subscribed organization admins as CSV', async () => {
    const repository: jest.Mocked<AdminUsersExportRepository> = {
      findSubscribedOrgAdmins: jest.fn().mockResolvedValue([
        {
          id: 'user-1' as UUID,
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          role: UserRole.ADMIN,
          orgName: 'Ayunis',
          teams: 'Engineering, Product',
          subscriptionType: 'SEAT_BASED',
          subscriptionStartsAt: new Date('2026-07-01T10:30:00.000Z'),
        },
        {
          id: 'user-2' as UUID,
          name: 'Grace',
          email: 'grace@example.com',
          role: UserRole.ADMIN,
          orgName: 'Future Org',
          teams: '',
          subscriptionType: 'USAGE_BASED',
          subscriptionStartsAt: '2026-09-15T00:00:00.000Z',
        },
      ]),
    };

    const csv = await new ExportAdminUsersUseCase(repository).execute();

    expect(repository.findSubscribedOrgAdmins).toHaveBeenCalledTimes(1);
    expect(csv).toBe(
      [
        '"Eindeutige ID","Vorname","Nachname","E-Mail","Rolle","Organisation","Teams","Abonnement","Abonnement Startdatum"',
        '"user-1","Ada","Lovelace","ada@example.com","admin","Ayunis","Engineering, Product","SEAT_BASED","2026-07-01"',
        '"user-2","Grace","","grace@example.com","admin","Future Org","","USAGE_BASED","2026-09-15"',
      ].join('\n'),
    );
  });
});
