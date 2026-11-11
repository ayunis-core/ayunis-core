import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  OwnerSelect,
  ownerKey,
  ownerOf,
  useResourceOwnership,
  type OwnedResource,
  type OwnedResourceKind,
  type OwnerSelection,
} from '@/features/resource-ownership';
import { useConfirmation } from '@/widgets/confirmation-modal';

export function ResourceOwnerCard({
  kind,
  resource,
  onPreview,
  onChange,
}: Readonly<{
  kind: OwnedResourceKind;
  resource: OwnedResource & { name: string };
  /** Resolves to the number of links the move would remove. */
  onPreview: (owner: OwnerSelection) => Promise<number>;
  onChange: (owner: OwnerSelection) => Promise<unknown>;
}>) {
  const { t } = useTranslation('ownership');
  const { options, labelOf } = useResourceOwnership(kind);
  const { confirm } = useConfirmation();
  const [isBusy, setIsBusy] = useState(false);
  const current = ownerOf(resource);

  // Nothing to choose: personal items of users who cannot share anywhere.
  if (!current || (options.length < 2 && current.ownerType === 'personal')) {
    return null;
  }

  const warningKey =
    kind === 'skill'
      ? 'change.skillLinksWarning'
      : 'change.knowledgeBaseLinksWarning';

  const moveDescription = (owner: OwnerSelection): string => {
    switch (owner.ownerType) {
      case 'personal':
        return t('change.toPersonal', { name: resource.name });
      case 'team':
        return t('change.toTeam', {
          name: resource.name,
          team: labelOf(owner),
        });
      case 'org':
        return t('change.toOrg', { name: resource.name });
    }
  };

  const handleSelect = async (key: string) => {
    const owner = options.find((option) => option.key === key)?.selection;
    if (!owner || key === ownerKey(current)) return;
    setIsBusy(true);
    try {
      const unlinkedCount = await onPreview(owner);
      confirm({
        title: t('change.title'),
        description: [
          moveDescription(owner),
          unlinkedCount > 0 ? t(warningKey, { count: unlinkedCount }) : '',
        ]
          .filter(Boolean)
          .join(' '),
        confirmText: t('change.confirm'),
        cancelText: t('change.cancel'),
        onConfirm: async () => {
          await onChange(owner);
        },
      });
    } catch {
      // The preview hook already reported the failure.
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('card.title')}</CardTitle>
        <CardDescription>
          {t(
            kind === 'skill'
              ? 'card.skillDescription'
              : 'card.knowledgeBaseDescription',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OwnerSelect
          options={options}
          value={ownerKey(current)}
          onValueChange={(key) => void handleSelect(key)}
          disabled={isBusy || options.length < 2}
          testId={`${kind}-owner-select`}
        />
      </CardContent>
    </Card>
  );
}
