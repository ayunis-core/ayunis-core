import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import SettingsLayout from '../../admin-settings-layout';
import { Button } from '@/shared/ui/shadcn/button';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  useIpAllowlistControllerGet,
  useIpAllowlistControllerUpdate,
  useIpAllowlistControllerRemove,
  getIpAllowlistControllerGetQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showSuccess, showError } from '@/shared/lib/toast';
import { isValidCidrOrIp } from '../lib/validate-cidr';
import { RemoveRestrictionsDialog } from './RemoveRestrictionsDialog';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';

export function SecuritySettingsPage() {
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const { t } = useTranslation('admin-settings-security');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useIpAllowlistControllerGet();
  const cidrsFromServer = data?.cidrs ?? [];

  const [cidrsText, setCidrsText] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const displayText = cidrsText ?? cidrsFromServer.join('\n');

  const updateMutation = useIpAllowlistControllerUpdate();
  const removeMutation = useIpAllowlistControllerRemove();
  const isMutating = updateMutation.isPending || removeMutation.isPending;

  const hasExistingRestrictions = cidrsFromServer.length > 0;
  const isDirty = cidrsText !== null;

  function parseCidrs(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  function handleSave() {
    const lines = parseCidrs(displayText);

    if (lines.length === 0) {
      if (hasExistingRestrictions) {
        setRemoveDialogOpen(true);
      }
      return;
    }

    const invalidLine = findFirstInvalidCidr(lines);
    if (invalidLine) {
      setValidationError(invalidLine);
      return;
    }
    setValidationError(null);

    updateMutation.mutate(
      { data: { cidrs: lines } },
      {
        onSuccess: () => {
          showSuccess(t('ipAllowlist.saveSuccess'));
          setCidrsText(null);
          void queryClient.invalidateQueries({
            queryKey: getIpAllowlistControllerGetQueryKey(),
          });
        },
        onError: (error) => {
          handleMutationError(error, 'save');
        },
      },
    );
  }

  function findFirstInvalidCidr(lines: string[]): string | null {
    for (let i = 0; i < lines.length; i++) {
      if (!isValidCidrOrIp(lines[i])) {
        return t('ipAllowlist.invalidCidr', {
          line: i + 1,
          value: lines[i],
        });
      }
    }
    return null;
  }

  function handleMutationError(error: unknown, operation: 'save' | 'remove') {
    try {
      const { code } = extractErrorData(error);
      if (code === 'ADMIN_LOCKOUT') {
        showError(t('ipAllowlist.lockoutError'));
      } else {
        showError(
          t(
            operation === 'save'
              ? 'ipAllowlist.saveError'
              : 'ipAllowlist.removeError',
          ),
        );
      }
    } catch {
      showError(
        t(
          operation === 'save'
            ? 'ipAllowlist.saveError'
            : 'ipAllowlist.removeError',
        ),
      );
    }
  }

  function handleRemoveConfirm() {
    removeMutation.mutate(undefined, {
      onSuccess: () => {
        showSuccess(t('ipAllowlist.removeSuccess'));
        setCidrsText(null);
        setRemoveDialogOpen(false);
        void queryClient.invalidateQueries({
          queryKey: getIpAllowlistControllerGetQueryKey(),
        });
      },
      onError: (error) => {
        handleMutationError(error, 'remove');
        setRemoveDialogOpen(false);
      },
    });
  }

  if (isLoading) {
    return (
      <SettingsLayout title={tLayout('layout.security')}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  if (isError) {
    return (
      <SettingsLayout title={tLayout('layout.security')}>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('ipAllowlist.loadError')}
                <Button
                  variant="link"
                  className="ml-2 h-auto p-0"
                  onClick={() => void refetch()}
                >
                  {t('ipAllowlist.retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={tLayout('layout.security')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('ipAllowlist.heading')}</CardTitle>
          <CardDescription>{t('ipAllowlist.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasExistingRestrictions && !isDirty && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('ipAllowlist.noRestrictions')}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="cidrs-textarea">
              {t('ipAllowlist.cidrsLabel')}
            </Label>
            <Textarea
              id="cidrs-textarea"
              placeholder={t('ipAllowlist.cidrsPlaceholder')}
              value={displayText}
              onChange={(e) => {
                setCidrsText(e.target.value);
                setValidationError(null);
              }}
              rows={8}
              className="font-mono text-sm"
            />
            {validationError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('ipAllowlist.propagationNote')}
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isMutating}>
              {updateMutation.isPending
                ? t('ipAllowlist.saving')
                : t('ipAllowlist.saveButton')}
            </Button>

            {hasExistingRestrictions && (
              <Button
                variant="destructive"
                onClick={() => setRemoveDialogOpen(true)}
                disabled={isMutating}
              >
                {removeMutation.isPending
                  ? t('ipAllowlist.removing')
                  : t('ipAllowlist.removeButton')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <RemoveRestrictionsDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        onConfirm={handleRemoveConfirm}
        isRemoving={isMutating}
      />
    </SettingsLayout>
  );
}
