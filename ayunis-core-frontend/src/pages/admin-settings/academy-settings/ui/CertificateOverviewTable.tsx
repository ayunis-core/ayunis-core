import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { FileDown, Loader2, Users } from 'lucide-react';
import type { OrgCertificateStatusResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatDate } from '@/shared/lib/format-date';
import { CertificateStatusBadge } from './CertificateStatusBadge';

interface CertificateOverviewTableProps {
  entries: OrgCertificateStatusResponseDto[];
  /** Only annual orgs have a renewal date, so the column is dropped otherwise. */
  showRenewalColumn: boolean;
  onDownloadCertificate: (userId: string) => void;
  /** The member whose certificate is being rendered right now, if any. */
  downloadingUserId: string | null;
}

export function CertificateOverviewTable({
  entries,
  showRenewalColumn,
  onDownloadCertificate,
  downloadingUserId,
}: Readonly<CertificateOverviewTableProps>) {
  const { t } = useTranslation('admin-settings-academy');

  // Rendered inside the card, so the filters stay on screen: an empty result
  // here is nearly always "your filter matched nobody", and replacing the card
  // would hide the control needed to undo it.
  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <Users className="text-muted-foreground" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t('overview.empty')}</EmptyTitle>
          <EmptyDescription>{t('overview.emptyDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('overview.column.member')}</TableHead>
          <TableHead>{t('overview.column.lastPassed')}</TableHead>
          {showRenewalColumn && (
            <TableHead>{t('overview.column.renewalDue')}</TableHead>
          )}
          <TableHead>{t('overview.column.status')}</TableHead>
          <TableHead>
            <span className="sr-only">{t('overview.column.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow
            key={entry.userId}
            data-testid={`academy-overview-row-${entry.userId}`}
          >
            <TableCell>
              <div className="font-medium">{entry.name}</div>
              <div className="text-sm text-muted-foreground">{entry.email}</div>
            </TableCell>
            <TableCell>
              <DateOrDash value={entry.completedAt} />
            </TableCell>
            {showRenewalColumn && (
              <TableCell>
                <DateOrDash value={entry.expiresAt} />
              </TableCell>
            )}
            <TableCell>
              <CertificateStatusBadge status={entry.status} />
            </TableCell>
            <TableCell className="text-right">
              {entry.completedAt !== null && (
                <CertificateDownloadButton
                  userId={entry.userId}
                  memberName={entry.name}
                  onDownload={onDownloadCertificate}
                  isDownloading={downloadingUserId === entry.userId}
                  disabled={downloadingUserId !== null}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DateOrDash({ value }: Readonly<{ value: string | null }>) {
  if (value === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <>{formatDate(value)}</>;
}

interface CertificateDownloadButtonProps {
  userId: string;
  memberName: string;
  onDownload: (userId: string) => void;
  isDownloading: boolean;
  disabled: boolean;
}

function CertificateDownloadButton({
  userId,
  memberName,
  onDownload,
  isDownloading,
  disabled,
}: Readonly<CertificateDownloadButtonProps>) {
  const { t } = useTranslation('admin-settings-academy');
  const label = t(
    isDownloading
      ? 'overview.certificate.downloading'
      : 'overview.certificate.download',
    { name: memberName },
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDownload(userId)}
          disabled={disabled}
          aria-label={label}
          aria-busy={isDownloading}
          data-testid={`academy-certificate-download-${userId}`}
        >
          {isDownloading ? <Loader2 className="animate-spin" /> : <FileDown />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
