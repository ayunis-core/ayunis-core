import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Label } from '@/shared/ui/shadcn/label';
import { useOrgMfaRequirement } from '../api/useOrgMfaRequirement';

export function MfaRequirementCard() {
  const { t } = useTranslation('admin-settings-security');
  const { required, isLoading, isUpdating, setRequired } =
    useOrgMfaRequirement();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('mfaRequirement.title')}</CardTitle>
        <CardDescription>{t('mfaRequirement.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="mfa-required-switch">
              {t('mfaRequirement.toggleLabel')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('mfaRequirement.toggleHint')}
            </p>
          </div>
          <Switch
            id="mfa-required-switch"
            checked={required}
            disabled={isLoading || isUpdating}
            onCheckedChange={setRequired}
          />
        </div>
      </CardContent>
    </Card>
  );
}
