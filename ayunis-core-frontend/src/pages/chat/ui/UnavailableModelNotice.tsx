import { useNavigate } from '@tanstack/react-router';
import { UnavailableModelNotice as SharedUnavailableModelNotice } from '@ayunis/chat/model-presentation';

export default function UnavailableModelNotice() {
  const navigate = useNavigate();
  return (
    <SharedUnavailableModelNotice
      onNewChat={() => void navigate({ to: '/chat' })}
    />
  );
}
