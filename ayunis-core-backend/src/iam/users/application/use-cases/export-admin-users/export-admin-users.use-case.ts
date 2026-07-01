import { Injectable, Logger } from '@nestjs/common';
import { convertCSVToString } from 'src/common/util/csv';
import {
  AdminUserExportRow,
  AdminUsersExportRepository,
} from '../../ports/admin-users-export.repository';
import { UserError, UserUnexpectedError } from '../../users.errors';

@Injectable()
export class ExportAdminUsersUseCase {
  private readonly logger = new Logger(ExportAdminUsersUseCase.name);

  constructor(
    private readonly adminUsersExportRepository: AdminUsersExportRepository,
  ) {}

  async execute(): Promise<string> {
    this.logger.log('Exporting admin users for subscribed organizations');

    try {
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
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      this.logger.error('Error exporting admin users', {
        error: error as Error,
      });
      throw new UserUnexpectedError(error as Error);
    }
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
    ].map((cell) => this.neutralizeFormula(cell));
  }

  // Prevent CSV formula injection: a cell beginning with =, +, -, @, tab, or
  // carriage return is treated as a formula by Excel/LibreOffice. Prefix such
  // values (which include user-controlled name/email/org/team fields) with a
  // single quote so spreadsheet apps render them as literal text.
  private neutralizeFormula(cell: string): string {
    if (cell.length > 0 && /^[=+\-@\t\r]/.test(cell)) {
      return `'${cell}`;
    }

    return cell;
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
    const value = date instanceof Date ? date : new Date(date);
    const day = String(value.getUTCDate()).padStart(2, '0');
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const year = value.getUTCFullYear();

    return `${day}.${month}.${year}`;
  }
}
