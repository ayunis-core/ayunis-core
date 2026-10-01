import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useConfirmation } from '@/widgets/confirmation-modal';
import type { SuperAdminOrgResponseDto } from '@/shared/api';
import { useSetOrgArchived } from '@/pages/super-admin-settings/org/api/useSetOrgArchived';
import DeleteOrgDialog from './DeleteOrgDialog';
export default function OrgLifecycleActions({
  org,
}: Readonly<{ org: SuperAdminOrgResponseDto }>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { confirm } = useConfirmation();
  const archive = useSetOrgArchived();
  function changeStatus() {
    confirm({
      title: t(
        org.archived ? 'lifecycle.restoreTitle' : 'lifecycle.archiveTitle',
      ),
      description: t(
        org.archived
          ? 'lifecycle.restoreDescription'
          : 'lifecycle.archiveDescription',
      ),
      confirmText: t(
        org.archived ? 'lifecycle.restoreButton' : 'lifecycle.archiveButton',
      ),
      cancelText: t('lifecycle.cancel'),
      onConfirm: () =>
        archive.mutate({ id: org.id, data: { archived: !org.archived } }),
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('lifecycle.managementTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          <Item>
            <ItemContent className="min-w-48">
              <ItemTitle>
                {t(org.archived ? 'lifecycle.restore' : 'lifecycle.archive')}
              </ItemTitle>
              <ItemDescription className="line-clamp-none">
                {t(
                  org.archived
                    ? 'lifecycle.restoreDescription'
                    : 'lifecycle.archiveDescription',
                )}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                variant="outline"
                disabled={archive.isPending}
                onClick={changeStatus}
                data-testid="org-archive-toggle"
              >
                {t(
                  org.archived
                    ? 'lifecycle.restoreButton'
                    : 'lifecycle.archiveButton',
                )}
              </Button>
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item>
            <ItemContent className="min-w-48">
              <ItemTitle>{t('lifecycle.delete')}</ItemTitle>
              <ItemDescription className="line-clamp-none">
                {t('lifecycle.deleteActionDescription')}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <DeleteOrgDialog org={org} />
            </ItemActions>
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
