import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { PasswordInput } from '@/shared/ui/shadcn/password-input';
import { Label } from '@/shared/ui/shadcn/label';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { useGetUserConfig, useSetUserConfig } from '../api/useUserConfig';
import type { McpIntegration } from '../model/types';
import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface UserConfigDialogProps {
  integration: McpIntegration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserConfigDialog({
  integration,
  open,
  onOpenChange,
}: UserConfigDialogProps) {
  const { t } = useTranslation('admin-settings-integrations');

  if (!integration) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {t('integrations.userConfig.title', { name: integration.name })}
          </DialogTitle>
          <DialogDescription>
            {t('integrations.userConfig.description')}
          </DialogDescription>
        </DialogHeader>
        <UserConfigForm
          integration={integration}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function UserConfigForm({
  integration,
  onClose,
}: {
  integration: McpIntegration;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin-settings-integrations');
  const { userConfig, isLoadingUserConfig } = useGetUserConfig(integration.id);
  const { setUserConfig, isSaving } = useSetUserConfig(integration.id, onClose);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const userFields = getUserFields(integration);

  useEffect(() => {
    if (userConfig?.configValues) {
      initFormFromExisting(userConfig.configValues, userFields, setFormValues);
    }
  }, [userConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoadingUserConfig) {
    return <UserConfigLoadingSkeleton />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserConfig(formValues);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {userFields.map((field) => (
        <UserConfigFieldInput
          key={field.key}
          field={field}
          value={formValues[field.key] ?? ''}
          onChange={(value) =>
            setFormValues((prev) => ({ ...prev, [field.key]: value }))
          }
          disabled={isSaving}
        />
      ))}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
        >
          {t('integrations.userConfig.cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? t('integrations.userConfig.saving')
            : t('integrations.userConfig.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}

function getUserFields(
  integration: McpIntegration,
): MarketplaceIntegrationConfigFieldDto[] {
  const schema = integration.configSchema as
    | { userFields?: MarketplaceIntegrationConfigFieldDto[] }
    | undefined;
  return schema?.userFields ?? [];
}

function initFormFromExisting(
  existing: Record<string, string>,
  fields: MarketplaceIntegrationConfigFieldDto[],
  setFormValues: (values: Record<string, string>) => void,
) {
  const initial: Record<string, string> = {};
  for (const field of fields) {
    const existingValue = existing[field.key];
    // Secret fields come back as "***" — don't prefill
    if (existingValue && existingValue !== '***') {
      initial[field.key] = existingValue;
    }
  }
  setFormValues(initial);
}

function UserConfigLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

interface UserConfigFieldInputProps {
  field: MarketplaceIntegrationConfigFieldDto;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

function UserConfigFieldInput({
  field,
  value,
  onChange,
  disabled,
}: UserConfigFieldInputProps) {
  const inputId = `user-config-${field.key}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {field.type === 'secret' ? (
        <PasswordInput
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.help ?? ''}
        />
      ) : (
        <Input
          id={inputId}
          type={field.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.help ?? ''}
        />
      )}
      {field.help && (
        <p className="text-xs text-muted-foreground">{field.help}</p>
      )}
    </div>
  );
}
