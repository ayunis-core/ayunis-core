import { useForm, useWatch } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { SharePointResolutionOutcome } from '@ayunis/api-client/schemas';
import { useAddSyncedLocation } from '@/widgets/knowledge-base-synced-locations/api/useAddSyncedLocation';
import { useResolveSharePointLocation } from '@/widgets/knowledge-base-synced-locations/api/useResolveSharePointLocation';
import {
  sharePointLocationFormSchema,
  type SharePointLocationFormValues,
} from '@/widgets/knowledge-base-synced-locations/model/sharePointLocationFormSchema';
import { SharePointResolutionResult } from './SharePointResolutionResult';

export function AddSharePointLocationDialog({
  knowledgeBaseId,
  open,
  onOpenChange,
  onAdded,
}: Readonly<{
  knowledgeBaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const form = useForm<SharePointLocationFormValues>({
    resolver: zodResolver(sharePointLocationFormSchema(t)),
    defaultValues: { url: '' },
  });
  const { resolve, resolution, resetResolution, isResolving } =
    useResolveSharePointLocation(form);
  const close = () => {
    form.reset();
    resetResolution();
    onOpenChange(false);
  };
  const { addSharePointLocation, isAdding } = useAddSyncedLocation(
    knowledgeBaseId,
    () => {
      onAdded();
      close();
    },
  );
  const url = useWatch({ control: form.control, name: 'url' });
  // Shown only for the URL as checked; editing it asks for a new check.
  const result = resolution?.url === url.trim() ? resolution.result : null;
  const found =
    result?.outcome === SharePointResolutionOutcome.found ? result : null;
  const isBusy = isResolving || isAdding;

  const submit = (values: SharePointLocationFormValues) => {
    if (found?.location) addSharePointLocation(found.location);
    else resolve(values);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else if (!isBusy) close();
      }}
    >
      <DialogContent>
        <Form {...form}>
          <form
            className="grid min-w-0 gap-4"
            onSubmit={(e) => void form.handleSubmit(submit)(e)}
          >
            <DialogHeader>
              <DialogTitle>
                {t('detail.syncedLocations.dialog.title')}
              </DialogTitle>
              <DialogDescription>
                {t('detail.syncedLocations.dialog.description')}
              </DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('detail.syncedLocations.dialog.urlLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      autoComplete="off"
                      placeholder={t(
                        'detail.syncedLocations.dialog.urlPlaceholder',
                      )}
                      data-testid="sharepoint-location-url"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {result && <SharePointResolutionResult result={result} />}
            <p className="text-xs text-muted-foreground">
              {t('detail.syncedLocations.accessNote')}
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={isBusy}
              >
                {t('detail.syncedLocations.dialog.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isBusy}
                data-testid={
                  found
                    ? 'sharepoint-location-add'
                    : 'sharepoint-location-check'
                }
              >
                {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {found
                  ? t('detail.syncedLocations.dialog.add')
                  : t('detail.syncedLocations.dialog.check')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
