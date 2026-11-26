import { useSkillsControllerFindAll } from '@ayunis/api-client/endpoints';
import { SkillsMenuAction } from '@ayunis/chat/surface';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { queryStatus } from '@/widgets/chat-input/lib/query-status';

export function SkillsSubmenu({
  onSkillSelect,
  selectedSkillId,
}: Readonly<{
  onSkillSelect: (skillId: string, skillName: string) => void;
  selectedSkillId?: string;
}>) {
  const query = useSkillsControllerFindAll(personalSkillListParams);
  const items = query.data?.data.filter(({ isActive }) => isActive) ?? [];
  return (
    <SkillsMenuAction
      items={items}
      status={queryStatus(query)}
      selectedId={selectedSkillId}
      onSelect={onSkillSelect}
    />
  );
}
