import { useEffect, useRef, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { SidebarMenuButton } from '@ayunis/ui/components/sidebar';
import { useReleaseNotes } from '@/features/useReleaseNotes';
import { useFeatureToggles } from '@/features/feature-toggles';
import { useUnreadReleaseNoteCount } from '@/features/release-notes';
import config from '@/shared/config';

/**
 * With release notes on, the megaphone opens the product updates page; with
 * routines off it opens the Announcable widget. Waits for the toggles,
 * because the Announcable script cannot be unloaded once injected.
 */
export function ReleaseNotesButton() {
  const { toggles } = useFeatureToggles();
  if (toggles?.releaseNotesEnabled) return <ProductUpdatesBell />;
  if (toggles?.routinesEnabled !== false || !config.features.announcableOrgId) {
    return null;
  }
  return <AnnouncableReleaseNotesButton />;
}

function ProductUpdatesBell() {
  const { t } = useTranslation('release-notes');
  const location = useLocation();
  const { unreadCount } = useUnreadReleaseNoteCount();

  return (
    <SidebarMenuButton
      asChild
      className="relative size-8 flex-shrink-0"
      size="sm"
      isActive={location.pathname.startsWith('/news')}
    >
      <Link
        to="/news"
        aria-label={t('bell.label')}
        title={t('bell.label')}
        data-testid="sidebar-product-updates"
      >
        <Megaphone className="size-4" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 size-2 rounded-full bg-brand"
            role="img"
            aria-label={t('bell.unread')}
            data-testid="sidebar-product-updates-unread"
          />
        )}
      </Link>
    </SidebarMenuButton>
  );
}

function AnnouncableReleaseNotesButton() {
  useReleaseNotes();

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
    >
      <button ref={buttonRef} id="updates-button">
        <Megaphone className="size-4" />
        {hasNewReleaseNotes && (
          <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500" />
        )}
      </button>
    </SidebarMenuButton>
  );
}
