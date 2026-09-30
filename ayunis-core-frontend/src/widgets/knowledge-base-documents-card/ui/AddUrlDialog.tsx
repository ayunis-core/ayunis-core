import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ayunis/ui/components/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { isValidUrl } from '@/widgets/knowledge-base-documents-card/lib/isValidUrl';
import {
  DEFAULT_REINDEX_INTERVAL_FIELDS,
  toReindexIntervalDto,
} from '@/widgets/knowledge-base-documents-card/lib/reindex-schedule';
import { setDocumentFormFieldErrors } from '@/widgets/knowledge-base-documents-card/lib/document-form-errors';
import { createAddUrlSchema } from '@/widgets/knowledge-base-documents-card/model/schemas';
import type {
  AddUrlFormFields,
  AddUrlInput,
} from '@/widgets/knowledge-base-documents-card/model/types';
import { ReindexIntervalFields } from './ReindexIntervalFields';

/** Link-depth options offered when adding a URL (0 = just this page). */
const URL_DEPTH_OPTIONS = [0, 1, 2] as const;

const DEFAULT_VALUES: AddUrlFormFields = {
  url: '',
  maxDepth: 0,
  reindexInterval: DEFAULT_REINDEX_INTERVAL_FIELDS,
};

export function AddUrlDialog({
  open,
  onOpenChange,
  onSubmit,
  isAddingUrl,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AddUrlInput) => Promise<unknown>;
  isAddingUrl: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const form = useForm<AddUrlFormFields>({
    resolver: zodResolver(createAddUrlSchema(t)),
    defaultValues: DEFAULT_VALUES,
  });
  const url = useWatch({ control: form.control, name: 'url' });
  const isUrlValid = isValidUrl(url.trim());

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isAddingUrl) return;
    if (!nextOpen) form.reset(DEFAULT_VALUES);
    onOpenChange(nextOpen);
  };

  const submit = async (fields: AddUrlFormFields) => {
    try {
      await onSubmit({
        url: fields.url.trim(),
        maxDepth: fields.maxDepth,
        reindexInterval: toReindexIntervalDto(fields.reindexInterval),
      });
      form.reset(DEFAULT_VALUES);
      onOpenChange(false);
    } catch (error) {
      // Other failures are reported by the mutation's toast.
      setDocumentFormFieldErrors(form, error, t);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="add-url-dialog">
        <DialogHeader>
          <DialogTitle>{t('detail.documents.urlDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('detail.documents.urlDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
          >
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">
                    {t('detail.documents.urlLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder={t('detail.documents.urlPlaceholder')}
                      data-testid="add-url-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxDepth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('detail.documents.urlDepthLabel')}</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                    disabled={isAddingUrl}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {URL_DEPTH_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {t(`detail.documents.urlDepthOption${option}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('detail.documents.urlDepthHint')}
                  </FormDescription>
                </FormItem>
              )}
            />
            <ReindexIntervalFields disabled={isAddingUrl} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isAddingUrl}
              >
                {t('detail.documents.urlDialogCancel')}
              </Button>
              <Button
                type="submit"
                disabled={!isUrlValid || isAddingUrl}
                data-testid="add-url-submit"
              >
                {isAddingUrl && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('detail.documents.addUrl')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
