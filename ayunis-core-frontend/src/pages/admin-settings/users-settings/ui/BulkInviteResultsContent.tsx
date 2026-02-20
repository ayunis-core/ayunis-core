import { Button } from '@/shared/ui/shadcn/button';
import { DialogFooter } from '@/shared/ui/shadcn/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { CheckCircle, Download, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CreateBulkInvitesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface BulkInviteResultsContentProps {
  results: CreateBulkInvitesResponseDto;
  hasUrls: boolean;
  onDownloadUrls: () => void;
  onClose: () => void;
}

export default function BulkInviteResultsContent({
  results,
  hasUrls,
  onDownloadUrls,
  onClose,
}: Readonly<BulkInviteResultsContentProps>) {
  const { t } = useTranslation('admin-settings-users');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="font-medium">{results.successCount}</span>
          <span className="text-muted-foreground">succeeded</span>
        </div>
        {results.failureCount > 0 && (
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="font-medium">{results.failureCount}</span>
            <span className="text-muted-foreground">failed</span>
          </div>
        )}
      </div>

      {results.failureCount > 0 && (
        <div className="max-h-[200px] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bulkInvite.email')}</TableHead>
                <TableHead>{t('bulkInvite.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.results
                .filter((r) => !r.success)
                .map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.email}</TableCell>
                    <TableCell className="text-destructive text-sm">
                      {result.errorMessage}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DialogFooter>
        {hasUrls && (
          <Button type="button" variant="outline" onClick={onDownloadUrls}>
            <Download className="mr-2 h-4 w-4" />
            {t('bulkInvite.downloadUrls')}
          </Button>
        )}
        <Button type="button" onClick={onClose}>
          {t('bulkInvite.close')}
        </Button>
      </DialogFooter>
    </div>
  );
}
