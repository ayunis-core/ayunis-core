import ResponseStartOrb from '@/pages/chat/ui/ResponseStartOrb';

/**
 * Placeholder shown before the first assistant message event arrives.
 * Mirrors AssistantRunBlock's outer spacing so the orb sits exactly where
 * the response's first text line will render.
 */
export default function LoadingAssistantBlock() {
  return (
    <div className="mt-4">
      <ResponseStartOrb />
    </div>
  );
}
