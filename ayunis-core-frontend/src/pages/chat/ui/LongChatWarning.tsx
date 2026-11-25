import { useNavigate } from '@tanstack/react-router';
import { LongChatWarning as SharedLongChatWarning } from '@ayunis/chat/model-presentation';

export default function LongChatWarning() {
  const navigate = useNavigate();
  return (
    <SharedLongChatWarning onNewChat={() => void navigate({ to: '/chat' })} />
  );
}
