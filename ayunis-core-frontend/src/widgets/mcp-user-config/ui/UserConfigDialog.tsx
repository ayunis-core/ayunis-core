import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { UserConfigForm } from './UserConfigForm';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface UserConfigDialogProps {
  readonly integration: McpIntegrationResponseDto | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Dialog wrapper around {@link UserConfigForm} for setting the current user's
 * personal credentials for a marketplace MCP integration.
 */
export function UserConfigDialog({
  integration,
  open,
  onOpenChange,
}: Readonly<UserConfigDialogProps>) {
  const { t } = useTranslation('mcp-user-config');

  if (!integration) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('title', { name: integration.name })}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <UserConfigForm
          key={integration.id}
          integration={integration}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
