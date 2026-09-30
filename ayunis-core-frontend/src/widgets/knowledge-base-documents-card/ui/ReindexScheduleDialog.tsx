import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Form } from '@ayunis/ui/components/form';
import type {
  KnowledgeBaseDocumentResponseDto,
  ReindexIntervalDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatDate } from '@/shared/lib/format-date';
import {
  toReindexIntervalDto,
  toReindexIntervalFields,
} from '@/widgets/knowledge-base-documents-card/lib/reindex-schedule';
import { setDocumentFormFieldErrors } from '@/widgets/knowledge-base-documents-card/lib/document-form-errors';
import { createReindexScheduleSchema } from '@/widgets/knowledge-base-documents-card/model/schemas';
import type { ReindexScheduleFormFields } from '@/widgets/knowledge-base-documents-card/model/types';
import { ReindexIntervalFields } from './ReindexIntervalFields';

/** Mount with a `key` per document so the form starts from its stored schedule. */
export function ReindexScheduleDialog({
  document,
  onOpenChange,
  onSubmit,
  isSaving,
}: Readonly<{
  document: KnowledgeBaseDocumentResponseDto;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    documentId: string,
    reindexInterval: ReindexIntervalDto | null,
  ) => Promise<unknown>;
  isSaving: boolean;
}>) {
  const { t, i18n } = useTranslation('knowledge-bases');
  const form = useForm<ReindexScheduleFormFields>({
    resolver: zodResolver(createReindexScheduleSchema(t)),
    defaultValues: {
      reindexInterval: toReindexIntervalFields(document.reindexInterval),
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open && isSaving) return;
    onOpenChange(open);
  };

  const submit = async (fields: ReindexScheduleFormFields) => {
    try {
      await onSubmit(document.id, toReindexIntervalDto(fields.reindexInterval));
      onOpenChange(false);
    } catch (error) {
      // Other failures are reported by the mutation's toast.
      setDocumentFormFieldErrors(form, error, t);
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent data-testid="reindex-schedule-dialog">
        <DialogHeader>
          <DialogTitle>{t('detail.documents.reindex.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('detail.documents.reindex.dialogDescription', {
              name: document.name,
            })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
          >
            <ReindexIntervalFields disabled={isSaving} />
            {document.nextReindexAt && (
              <p
                className="text-sm text-muted-foreground"
                data-testid="reindex-schedule-next-run"
              >
                {t('detail.documents.reindex.nextRun', {
                  date: formatDate(document.nextReindexAt, i18n.language),
                })}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSaving}
              >
                {t('detail.documents.reindex.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                data-testid="reindex-schedule-save"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('detail.documents.reindex.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
