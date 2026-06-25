import { Injectable, Logger } from '@nestjs/common';
import { convertCSVToString } from 'src/common/util/csv';
import {
  AdminUserExportRow,
  AdminUsersExportRepository,
} from '../../ports/admin-users-export.repository';

@Injectable()
export class ExportAdminUsersUseCase {
  private readonly logger = new Logger(ExportAdminUsersUseCase.name);

  constructor(
    private readonly adminUsersExportRepository: AdminUsersExportRepository,
  ) {}

  async execute(): Promise<string> {
    this.logger.log('Exporting admin users for subscribed organizations');

    const rows =
      await this.adminUsersExportRepository.findSubscribedOrgAdmins();

    return convertCSVToString({
      headers: [
        'Eindeutige ID',
        'Vorname',
        'Nachname',
        'E-Mail',
        'Rolle',
        'Organisation',
        'Teams',
        'Abonnement',
        'Abonnement Startdatum',
      ],
      rows: rows.map((row) => this.toCsvRow(row)),
    });
  }

  private toCsvRow(row: AdminUserExportRow): string[] {
    const { firstName, lastName } = this.splitName(row.name);

    return [
      row.id,
      firstName,
      lastName,
      row.email,
      row.role,
      row.orgName,
      row.teams ?? '',
      row.subscriptionType,
      this.formatDate(row.subscriptionStartsAt),
    ];
  }

  private splitName(name: string): { firstName: string; lastName: string } {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return { firstName: '', lastName: '' };
    }

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }

    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1],
    };
  }

  private formatDate(date: Date | string): string {
    if (date instanceof Date) {
      return date.toISOString().slice(0, 10);
    }

    return new Date(date).toISOString().slice(0, 10);
  }
}
