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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { useAddWebsite } from '@/widgets/knowledge-base-synced-locations/api/useAddWebsite';
import {
  WEBSITE_DEPTH_OPTIONS,
  websiteFormSchema,
  type WebsiteFormValues,
} from '@/widgets/knowledge-base-synced-locations/model/websiteFormSchema';

export function AddWebsiteDialog({
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
  const form = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteFormSchema(t)),
    defaultValues: { url: '', maxDepth: 0 },
  });
  const close = () => {
    form.reset();
    onOpenChange(false);
  };
  const { addWebsite, isAdding } = useAddWebsite(knowledgeBaseId, form, () => {
    onAdded();
    close();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else if (!isAdding) close();
      }}
    >
      <DialogContent>
        <Form {...form}>
          <form
            className="grid min-w-0 gap-4"
            onSubmit={(e) => void form.handleSubmit(addWebsite)(e)}
          >
            <DialogHeader>
              <DialogTitle>
                {t('detail.syncedLocations.website.dialog.title')}
              </DialogTitle>
              <DialogDescription>
                {t('detail.syncedLocations.website.dialog.description')}
              </DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('detail.syncedLocations.website.dialog.urlLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      autoComplete="off"
                      placeholder={t(
                        'detail.syncedLocations.website.dialog.urlPlaceholder',
                      )}
                      data-testid="website-url"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage data-testid="website-url-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxDepth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('detail.syncedLocations.website.dialog.depthLabel')}
                  </FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                    disabled={isAdding}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="w-full"
                        data-testid="website-depth"
                      >
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WEBSITE_DEPTH_OPTIONS.map((option) => (
                        <SelectItem
                          key={option}
                          value={String(option)}
                          data-testid={`website-depth-${option}`}
                        >
                          {t(
                            `detail.syncedLocations.website.dialog.depthOption${option}`,
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('detail.syncedLocations.website.dialog.depthHint')}
                  </FormDescription>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={isAdding}
              >
                {t('detail.syncedLocations.website.dialog.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isAdding}
                data-testid="website-add"
              >
                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('detail.syncedLocations.website.dialog.add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
