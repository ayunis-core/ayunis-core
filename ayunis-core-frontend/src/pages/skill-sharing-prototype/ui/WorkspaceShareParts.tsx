import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { WORKSPACE_ACCESS_LABEL } from '@/widgets/sharing-prototype/model/fixtures';
import type {
  MemberAccess,
  Person,
} from '@/widgets/sharing-prototype/model/types';
import { WorkspaceAccessSelect } from './WorkspaceAccessSelect';

export function RemoveButton({
  label,
  onClick,
}: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
        >
          <X />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AccessControl({
  access,
  name,
  canChange,
  onChange,
  onRemove,
}: Readonly<{
  access: MemberAccess;
  name: string;
  canChange: boolean;
  onChange: (access: MemberAccess) => void;
  onRemove?: () => void;
}>) {
  if (!canChange) {
    return (
      <span className="text-sm text-muted-foreground">
        {WORKSPACE_ACCESS_LABEL[access]}
      </span>
    );
  }
  return (
    <>
      <WorkspaceAccessSelect
        value={access}
        onChange={onChange}
        ariaLabel={`Recht von ${name}`}
        className="w-40"
      />
      {onRemove ? (
        <RemoveButton label="Entfernen" onClick={onRemove} />
      ) : (
        <span className="size-9 shrink-0" aria-hidden="true" />
      )}
    </>
  );
}

export function ShareRow({
  title,
  description,
  actions,
}: Readonly<{ title: ReactNode; description: string; actions: ReactNode }>) {
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
      <ItemActions>{actions}</ItemActions>
    </Item>
  );
}

export function SectionTitle({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <h3 className="pt-2 text-xs font-medium text-muted-foreground">
      {children}
    </h3>
  );
}

export function PersonTitle({
  member,
  viewer,
}: Readonly<{ member: Person; viewer: Person }>) {
  return (
    <>
      {member.name}
      {member.id === viewer.id && (
        <span className="text-muted-foreground">(Sie)</span>
      )}
    </>
  );
}

export function OwnerLabel() {
  return (
    <span className="text-sm text-muted-foreground">
      {WORKSPACE_ACCESS_LABEL.owner}
    </span>
  );
}
