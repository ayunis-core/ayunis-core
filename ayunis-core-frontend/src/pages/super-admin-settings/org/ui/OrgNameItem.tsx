import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { SuperAdminOrgResponseDto } from '@/shared/api';
import { Button } from '@ayunis/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Loader2, PencilIcon } from 'lucide-react';
import useSuperAdminUpdateOrgName from '@/pages/super-admin-settings/org/api/useSuperAdminUpdateOrgName';
import { buildOrgNameSchema } from '@/pages/super-admin-settings/org/lib/org-name';
import type { UpdateOrgNameFormData } from '@/pages/super-admin-settings/org/model/types';

interface OrgNameItemProps {
  org: SuperAdminOrgResponseDto;
}

export default function OrgNameItem({ org }: Readonly<OrgNameItemProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<UpdateOrgNameFormData>({
    resolver: zodResolver(buildOrgNameSchema(t)),
    defaultValues: { name: org.name },
  });
  const { updateOrgName, isPending } = useSuperAdminUpdateOrgName({
    orgId: org.id,
    form,
    onSuccess: () => setIsEditing(false),
  });

  useEffect(() => {
    form.reset({ name: org.name });
  }, [form, org.name]);

  const handleSubmit = form.handleSubmit((data) => updateOrgName(data));

  function stopEditing() {
    setIsEditing(false);
    form.reset({ name: org.name });
  }

  if (!isEditing) {
    return (
      <Item>
        <ItemContent>
          <ItemTitle>{t('orgDetails.name')}</ItemTitle>
          <ItemDescription data-testid="org-name-value">
            {org.name}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            data-testid="org-name-edit"
          >
            <PencilIcon />
            {t('orgDetails.rename.edit')}
          </Button>
        </ItemActions>
      </Item>
    );
  }

  return (
    <Item>
      <Form {...form}>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex w-full flex-wrap items-start gap-2"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="min-w-48 flex-1">
                <FormLabel>{t('orgDetails.name')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    disabled={isPending}
                    data-testid="org-name-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <ItemActions className="mt-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={stopEditing}
              disabled={isPending}
              data-testid="org-name-cancel"
            >
              {t('orgDetails.rename.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              data-testid="org-name-save"
            >
              {isPending && <Loader2 className="animate-spin" />}
              {t('orgDetails.rename.save')}
            </Button>
          </ItemActions>
        </form>
      </Form>
    </Item>
  );
}
