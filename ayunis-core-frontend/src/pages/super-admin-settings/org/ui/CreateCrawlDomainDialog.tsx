import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSuperAdminGrantCrawlDomain } from '../api/useSuperAdminGrantCrawlDomain';

interface CreateCrawlDomainDialogProps {
  orgId: string;
}

interface CreateCrawlDomainFormData {
  domain: string;
}

export default function CreateCrawlDomainDialog({
  orgId,
}: Readonly<CreateCrawlDomainDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [isOpen, setIsOpen] = useState(false);
  const { grantCrawlDomain, isLoading } = useSuperAdminGrantCrawlDomain(orgId, {
    onSuccessCallback: () => {
      setIsOpen(false);
      form.reset();
    },
  });

  const form = useForm<CreateCrawlDomainFormData>({
    defaultValues: {
      domain: '',
    },
  });

  function onSubmit(data: CreateCrawlDomainFormData) {
    grantCrawlDomain(data.domain.trim());
  }

  function handleOpenChange(open: boolean) {
    if (!open && !isLoading) {
      form.reset();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">{t('crawlDomains.createDomain.button')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('crawlDomains.createDomain.title')}</DialogTitle>
          <DialogDescription>
            {t('crawlDomains.createDomain.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="domain"
              rules={{
                required: t('crawlDomains.createDomain.required'),
                validate: (value) =>
                  value.trim().length > 0 ||
                  t('crawlDomains.createDomain.required'),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('crawlDomains.createDomain.label')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('crawlDomains.createDomain.placeholder')}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                {t('crawlDomains.createDomain.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('crawlDomains.createDomain.creating')
                  : t('crawlDomains.createDomain.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
