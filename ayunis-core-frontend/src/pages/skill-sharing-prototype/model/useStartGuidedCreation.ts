import { useNavigate } from '@tanstack/react-router';
import { GUIDED_SKILL_PROMPT } from '@/widgets/sharing-prototype/model/starter-fixtures';

export function useStartGuidedCreation(
  workspaceName?: string,
): (topic?: string) => void {
  const navigate = useNavigate();
  return (topic = '') => {
    const parts = [GUIDED_SKILL_PROMPT];
    if (workspaceName) {
      parts.push(
        `Die Fähigkeit soll dem Arbeitsbereich „${workspaceName}“ gehören.`,
      );
    }
    if (topic.trim()) {
      parts.push(`Die Fähigkeit soll mir hierbei helfen: ${topic.trim()}`);
    }
    void navigate({ to: '/chat', search: { prompt: parts.join(' ') } });
  };
}
