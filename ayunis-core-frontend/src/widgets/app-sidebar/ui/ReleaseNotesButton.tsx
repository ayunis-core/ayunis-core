import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SidebarMenuButton } from '@/shared/ui/shadcn/sidebar';
import { useReleaseNotes } from '@/features/useReleaseNotes';

export function ReleaseNotesButton() {
  useReleaseNotes();
  const { t } = useTranslation('common');

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hasNewReleaseNotes, setHasNewReleaseNotes] = useState(false);

  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;
    const check = () =>
      setHasNewReleaseNotes(node.dataset.newReleaseNotes === 'true');
    check();
    const observer = new MutationObserver(check);
    observer.observe(node, {
      attributes: true,
      attributeFilter: ['data-new-release-notes'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <SidebarMenuButton
      asChild
      className="relative size-8 flex-shrink-0"
      size="sm"
      tooltip={t('sidebar.updates')}
    >
      <button ref={buttonRef} id="updates-button" type="button">
        <Bell className="size-4" />
        {hasNewReleaseNotes && (
          <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500" />
        )}
      </button>
    </SidebarMenuButton>
  );
}
