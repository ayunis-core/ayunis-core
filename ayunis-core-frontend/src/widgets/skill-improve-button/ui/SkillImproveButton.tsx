import { useImproveSkillText } from '@/features/skill-actions';
import { ImproveTextButton } from '@/shared/ui/improve-text-button';
import type { ImproveSkillTextDtoField } from '@ayunis/api-client/schemas';

interface SkillImproveButtonProps {
  field: ImproveSkillTextDtoField;
  name?: string;
  trigger: string;
  instructions: string;
  workspaceId?: string;
  onImproved: (text: string) => void;
  onPendingChange?: (isPending: boolean) => void;
}

export function SkillImproveButton({
  field,
  name,
  trigger,
  instructions,
  workspaceId,
  onImproved,
  onPendingChange,
}: Readonly<SkillImproveButtonProps>) {
  const improve = useImproveSkillText();

  return (
    <ImproveTextButton
      text={field === 'instructions' ? instructions : trigger}
      isPending={improve.isPending}
      improve={(sourceText, onSuccess) =>
        improve.mutate(
          {
            field,
            name,
            trigger: field === 'trigger' ? sourceText : trigger,
            instructions: field === 'instructions' ? sourceText : instructions,
            workspaceId,
          },
          { onSuccess },
        )
      }
      onImproved={onImproved}
      onPendingChange={onPendingChange}
      testId={`improve-skill-${field}`}
    />
  );
}
