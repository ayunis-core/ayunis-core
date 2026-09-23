import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import {
  parseInviteCsv,
  generateInviteTemplate,
  generateUrlsCsv,
  downloadCsv,
  type ParsedInvite,
  type CsvError,
} from '@/features/bulk-user-invite/lib/csv-utils';
import {
  type BulkInviteValidationError,
  useBulkInviteCreate,
} from '@/features/bulk-user-invite/api/useBulkInviteCreate';
import { applyValidationErrors } from '@/features/bulk-user-invite/lib/apply-validation-errors';
import BulkInviteResultsContent from './BulkInviteResultsContent';
import type { CreateBulkInvitesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Badge } from '@ayunis/ui/components/badge';

type DialogStep = 'upload' | 'preview' | 'submitting' | 'results';

interface BulkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId?: string;
}

export default function BulkInviteDialog({
  open,
  onOpenChange,
  orgId,
}: Readonly<BulkInviteDialogProps>) {
  const { t } = useTranslation('admin-settings-users');
  const [step, setStep] = useState<DialogStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedInvite[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<CreateBulkInvitesResponseDto | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  const resetState = useCallback(() => {
    setStep('upload');
    setParsedData([]);
    setParseError(null);
    setResults(null);
    setIsDragging(false);
  }, []);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        resetState();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, resetState],
  );

  const handleClose = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const { createBulkInvites } = useBulkInviteCreate(
    orgId,
    (response: CreateBulkInvitesResponseDto) => {
      setResults(response);
      setStep('results');
    },
    (errors: BulkInviteValidationError[]) => {
      setParsedData((current) => applyValidationErrors(current, errors, t));
      setStep('preview');
    },
  );

  // Translate CSV error codes to localized messages
  const translateCsvError = useCallback(
    (error: CsvError): string => {
      switch (error.code) {
        case 'EMPTY_FILE':
          return t('bulkInvite.emptyFile');
        case 'INVALID_HEADERS':
          return t('bulkInvite.invalidHeaders');
        case 'INVALID_ROW_FORMAT':
          return t('bulkInvite.invalidRowFormat');
        case 'INVALID_EMAIL':
          return t('bulkInvite.invalidEmail');
        case 'INVALID_ROLE':
          return t('bulkInvite.invalidRole');
        case 'DUPLICATE_EMAIL':
          return t('bulkInvite.duplicateEmailWithRow', {
            row: error.firstOccurrenceRow,
          });
        default:
          return t('bulkInvite.parseError');
      }
    },
    [t],
  );

  const handleFileRead = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const result = parseInviteCsv(content);

        if (!result.success && result.errors.length > 0) {
          const firstError = result.errors[0];
          // Only show file-level errors (EMPTY_FILE, INVALID_HEADERS) as parse errors
          // Row-level errors will be shown in the preview table
          if (
            firstError.code === 'EMPTY_FILE' ||
            firstError.code === 'INVALID_HEADERS'
          ) {
            setParseError(translateCsvError(firstError));
            return;
          }
        }

        if (result.data.length === 0) {
          setParseError(t('bulkInvite.emptyFile'));
          return;
        }

        if (result.data.length > 500) {
          setParseError(t('bulkInvite.tooManyRows'));
          return;
        }

        setParsedData(result.data);
        setParseError(null);
        setStep('preview');
      };
      reader.onerror = () => {
        setParseError(t('bulkInvite.parseError'));
      };
      reader.readAsText(file);
    },
    [t, translateCsvError],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileRead(file);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleFileRead],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0] as File | undefined;
      if (file?.name.endsWith('.csv')) {
        handleFileRead(file);
      } else {
        setParseError(t('bulkInvite.csvFormat'));
      }
    },
    [handleFileRead, t],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    const template = generateInviteTemplate();
    downloadCsv(template, 'invite-template.csv');
  }, []);

  const handleSubmit = useCallback(() => {
    const validInvites = parsedData
      .filter((item) => item.isValid)
      .map((item) => ({
        email: item.email,
        role: item.role,
        teamNames: item.teamNames,
      }));

    if (validInvites.length > 0) {
      setStep('submitting');
      createBulkInvites(validInvites);
    }
  }, [parsedData, createBulkInvites]);

  const handleDownloadUrls = useCallback(() => {
    if (results) {
      const urlResults = results.results
        .filter((r) => r.success && r.url)
        .map((r) => ({ email: r.email, url: r.url! }));
      if (urlResults.length > 0) {
        const csv = generateUrlsCsv(urlResults);
        downloadCsv(csv, 'invite-urls.csv');
      }
    }
  }, [results]);

  const handleBack = useCallback(() => {
    setStep('upload');
    setParsedData([]);
    setParseError(null);
  }, []);

  const allValid = parsedData.every((item) => item.isValid);
  const validCount = parsedData.filter((item) => item.isValid).length;
  const hasUrls = results?.results.some((r) => r.success && r.url);

  // Upload Step
  const uploadContent = (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('bulkInvite.selectFile')}
          </Button>
          <input
            ref={fileInputRef}
            data-testid="bulk-invite-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground">
            {t('bulkInvite.dragDrop')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('bulkInvite.csvFormat')}
          </p>
        </div>
      </div>

      {parseError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {parseError}
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDownloadTemplate}
        >
          <Download />
          {t('bulkInvite.downloadTemplate')}
        </Button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleClose}>
          {t('inviteDialog.cancel')}
        </Button>
      </DialogFooter>
    </div>
  );

  // Preview Step
  const previewContent = (
    <div className="min-w-0 space-y-4">
      <div className="max-h-[300px] w-full overflow-auto rounded-md border">
        <Table className="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">
                {t('bulkInvite.rowNumber')}
              </TableHead>
              <TableHead>{t('bulkInvite.email')}</TableHead>
              <TableHead className="w-[100px]">
                {t('bulkInvite.role')}
              </TableHead>
              <TableHead>{t('bulkInvite.teams')}</TableHead>
              <TableHead className="w-[100px]">
                {t('bulkInvite.status')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedData.map((item, index) => (
              <TableRow
                key={index}
                className={cn(!item.isValid && 'bg-destructive/5')}
              >
                <TableCell className="font-mono text-sm">
                  {item.rowNumber}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="truncate max-w-[250px]">{item.email}</span>
                    {item.error && (
                      <span className="text-xs text-destructive">
                        {translateCsvError(item.error)}
                      </span>
                    )}
                    {item.serverError && (
                      <span
                        className="text-xs text-destructive"
                        data-testid={`bulk-invite-server-error-${item.rowNumber}`}
                      >
                        {item.serverError}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {item.role}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[220px]">
                  {item.teamNames.length > 0 ? item.teamNames.join(', ') : '—'}
                </TableCell>
                <TableCell>
                  {item.isValid ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">{t('bulkInvite.valid')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs">{t('bulkInvite.invalid')}</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        {validCount} / {parsedData.length} {t('bulkInvite.valid').toLowerCase()}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleBack}>
          {t('bulkInvite.back')}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!allValid || parsedData.length === 0}
          data-testid="bulk-invite-submit"
        >
          {t('bulkInvite.submit', { count: validCount })}
        </Button>
      </DialogFooter>
    </div>
  );

  // Submitting Step
  const submittingContent = (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">{t('bulkInvite.submitting')}</p>
    </div>
  );

  // Results Step
  const resultsContent = results && (
    <BulkInviteResultsContent
      results={results}
      hasUrls={hasUrls ?? false}
      onDownloadUrls={handleDownloadUrls}
      onClose={handleClose}
    />
  );

  const getContent = () => {
    switch (step) {
      case 'upload':
        return uploadContent;
      case 'preview':
        return previewContent;
      case 'submitting':
        return submittingContent;
      case 'results':
        return resultsContent;
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'upload':
        return t('bulkInvite.uploadTitle');
      case 'preview':
        return t('bulkInvite.previewTitle');
      case 'submitting':
        return t('bulkInvite.dialogTitle');
      case 'results':
        return t('bulkInvite.resultsTitle');
    }
  };

  const getDescription = () => {
    switch (step) {
      case 'upload':
        return t('bulkInvite.uploadDescription');
      case 'preview':
        return t('bulkInvite.previewDescription');
      case 'submitting':
        return t('bulkInvite.submitting');
      case 'results':
        return t('bulkInvite.resultsDescription', {
          success: results?.successCount ?? 0,
          total: results?.totalCount ?? 0,
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] min-w-0 max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-[700px]"
        data-testid="bulk-invite-dialog"
      >
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        {getContent()}
      </DialogContent>
    </Dialog>
  );
}
