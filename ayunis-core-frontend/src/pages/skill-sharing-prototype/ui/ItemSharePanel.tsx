import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Switch } from '@ayunis/ui/components/switch';
import { showSuccess } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  findTeam,
  orgMemberCount,
} from '@/widgets/sharing-prototype/model/access';
import {
  isSharedWith,
  itemSharesOf,
  setItemShared,
} from '@/widgets/sharing-prototype/model/prototype-shares';
import {
  useHasPermission,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  OwnedItem,
  Person,
  ResourceKind,
  TransferTarget,
} from '@/widgets/sharing-prototype/model/types';
import { RESOURCE_NOUN } from '@/pages/skill-sharing-prototype/lib/requests';

interface ShareRowProps {
  title: string;
  description: string;
  isShared: boolean;
  isAllowed: boolean;
  onChange: (isShared: boolean) => void;
}

function ShareRow({
  title,
  description,
  isShared,
  isAllowed,
  onChange,
}: Readonly<ShareRowProps>) {
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          checked={isShared}
          disabled={!isAllowed}
          aria-label={`Mit ${title} teilen`}
          onCheckedChange={onChange}
        />
      </ItemActions>
    </Item>
  );
}

function targetName(target: TransferTarget): string {
  return target.kind === 'org'
    ? 'der Organisation'
    : `Team ${findTeam(target.teamId).name}`;
}

function audience(target: TransferTarget): string {
  return target.kind === 'org'
    ? `Alle ${orgMemberCount()} Personen in der Organisation`
    : `Alle ${findTeam(target.teamId).memberCount} Mitglieder`;
}

function useToggleShare(item: OwnedItem, resource: ResourceKind) {
  const { confirm } = useConfirmation();
  const noun = RESOURCE_NOUN[resource];
  return (target: TransferTarget, isShared: boolean) => {
    if (isShared) {
      confirm({
        title: `${noun} mit ${targetName(target)} teilen`,
        description: `${audience(target)} können „${item.name}“ dann nutzen. Ändern können nur Sie.`,
        confirmText: 'Teilen',
        cancelText: 'Abbrechen',
        onConfirm: () => {
          setItemShared(resource, item.id, target, true);
          showSuccess(
            `„${item.name}“ ist jetzt mit ${targetName(target)} geteilt.`,
          );
        },
      });
      return;
    }
    confirm({
      title: 'Freigabe entfernen',
      description: `${audience(target)} können „${item.name}“ danach nicht mehr nutzen.`,
      confirmText: 'Entfernen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
      onConfirm: () => {
        setItemShared(resource, item.id, target, false);
        showSuccess('Freigabe entfernt.');
      },
    });
  };
}

function useShareRights(resource: ResourceKind) {
  const { role } = usePrototypeState();
  const mayShareWithTeams = useHasPermission(
    role,
    resource === 'skill'
      ? 'request_skill_transfer'
      : 'request_knowledge_transfer',
  );
  const mayShareWithOrg = useHasPermission(
    role,
    resource === 'skill'
      ? 'request_skill_transfer_org'
      : 'request_knowledge_transfer_org',
  );
  return { mayShareWithTeams, mayShareWithOrg };
}

export function ItemSharePanel({
  item,
  resource,
  person,
}: Readonly<{ item: OwnedItem; resource: ResourceKind; person: Person }>) {
  const state = usePrototypeState();
  const targets = itemSharesOf(state, resource, item.id);
  const toggle = useToggleShare(item, resource);
  const { mayShareWithTeams, mayShareWithOrg } = useShareRights(resource);
  const org: TransferTarget = { kind: 'org' };

  return (
    <div className="space-y-4">
      <ShareRow
        title="Organisation"
        description={
          mayShareWithOrg
            ? `${audience(org)} können die ${RESOURCE_NOUN[resource]} nutzen.`
            : 'Mit der Organisation teilen ist in Ihrer Verwaltung nicht erlaubt.'
        }
        isShared={isSharedWith(targets, org)}
        isAllowed={mayShareWithOrg}
        onChange={(isShared) => toggle(org, isShared)}
      />
      {person.teamIds.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Teams</h3>
          {person.teamIds.map((teamId) => {
            const target: TransferTarget = { kind: 'team', teamId };
            return (
              <ShareRow
                key={teamId}
                title={`Team ${findTeam(teamId).name}`}
                description={
                  mayShareWithTeams
                    ? `${audience(target)} können die ${RESOURCE_NOUN[resource]} nutzen.`
                    : 'Mit Teams teilen ist in Ihrer Verwaltung nicht erlaubt.'
                }
                isShared={isSharedWith(targets, target)}
                isAllowed={mayShareWithTeams}
                onChange={(isShared) => toggle(target, isShared)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
