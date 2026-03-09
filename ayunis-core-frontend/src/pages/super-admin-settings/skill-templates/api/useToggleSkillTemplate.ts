import { useState } from 'react';
import type { SkillTemplateResponseDto } from '@/shared/api';
import { useUpdateSkillTemplate } from './useUpdateSkillTemplate';

export function useToggleSkillTemplate() {
  const { updateSkillTemplate } = useUpdateSkillTemplate();
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  function toggleEnabled(template: SkillTemplateResponseDto) {
    setTogglingIds((prev) => new Set(prev).add(template.id));
    void updateSkillTemplate(template.id, {
      isActive: !template.isActive,
    })
      .catch(() => {
        /* error already handled by mutation onError */
      })
      .finally(() => {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(template.id);
          return next;
        });
      });
  }

  return { toggleEnabled, togglingIds };
}
