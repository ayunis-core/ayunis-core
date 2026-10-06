import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { PrototypeSkill } from '@/widgets/sharing-prototype/model/types';
import { ActiveSwitch } from './ActiveSwitch';

export function SkillListRow({
  skill,
  label,
  onOpen,
}: Readonly<{
  skill: PrototypeSkill;
  label: string | null;
  onOpen: () => void;
}>) {
  return (
    <Item
      variant="outline"
      className="cursor-pointer hover:bg-accent/50"
      onClick={onOpen}
    >
      <ItemContent>
        <ItemTitle>{skill.name}</ItemTitle>
        <ItemDescription className="line-clamp-1">
          {skill.shortDescription}
        </ItemDescription>
      </ItemContent>
      <ItemActions onClick={(event) => event.stopPropagation()}>
        {label && (
          <span className="max-w-56 truncate text-sm text-muted-foreground">
            {label}
          </span>
        )}
        <ActiveSwitch skillId={skill.id} />
      </ItemActions>
    </Item>
  );
}
