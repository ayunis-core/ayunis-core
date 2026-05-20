import { Building2, ArrowUp, Plus, ShieldCheck, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/shadcn/utils';

interface SidebarPreviewProps {
  favicon: string | null;
  name: string;
  // When null/null, the preview renders with the design system's primary
  // token (`bg-primary text-primary-foreground`). When set, the user has
  // picked a custom color and we apply it via inline style.
  primaryColor: string | null;
  primaryForeground: string | null;
}

/**
 * Three side-by-side preview cards showing different aspects of where
 * the org's branding appears in the app — sidebar, chat input, toggles.
 * Purely visual; nothing focusable.
 */
export function SidebarPreview({
  favicon,
  name,
  primaryColor,
  primaryForeground,
}: SidebarPreviewProps) {
  const { t } = useTranslation('admin-settings-organization');
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none grid select-none gap-3 sm:grid-cols-3"
    >
      <PreviewCard label={t('organization.previewSectionSidebar')}>
        <SidebarSnippet favicon={favicon} name={name} />
      </PreviewCard>
      <PreviewCard label={t('organization.previewSectionChat')}>
        <ChatInputSnippet
          primaryColor={primaryColor}
          primaryForeground={primaryForeground}
        />
      </PreviewCard>
      <PreviewCard label={t('organization.previewSectionToggles')}>
        <TogglesSnippet primaryColor={primaryColor} />
      </PreviewCard>
    </div>
  );
}

function PreviewCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="h-36">{children}</div>
    </div>
  );
}

function SidebarSnippet({
  favicon,
  name,
}: {
  favicon: string | null;
  name: string;
}) {
  return (
    <div className="h-full overflow-hidden rounded-lg border bg-sidebar p-3 text-sidebar-foreground">
      {/* Header: favicon + name */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md',
            !favicon && 'bg-sidebar-accent',
          )}
        >
          {favicon ? (
            <img src={favicon} alt="" className="size-full object-cover" />
          ) : (
            <Building2
              className="size-4 text-sidebar-foreground/60"
              aria-hidden="true"
            />
          )}
        </div>
        <span className="truncate text-xs font-semibold leading-tight">
          {name}
        </span>
      </div>

      {/* Menu items */}
      <div className="mt-3 space-y-1">
        <div className="flex h-5 items-center rounded-md bg-sidebar-accent px-2">
          <div className="h-1.5 w-12 rounded bg-sidebar-foreground/60" />
        </div>
        <div className="flex h-5 items-center px-2">
          <div className="h-1.5 w-14 rounded bg-sidebar-foreground/30" />
        </div>
        <div className="flex h-5 items-center px-2">
          <div className="h-1.5 w-10 rounded bg-sidebar-foreground/30" />
        </div>
      </div>
    </div>
  );
}

function ChatInputSnippet({
  primaryColor,
  primaryForeground,
}: {
  primaryColor: string | null;
  primaryForeground: string | null;
}) {
  return (
    <div className="flex h-full flex-col justify-center rounded-lg border bg-background p-3">
      <div className="rounded-xl border bg-card p-2 shadow-sm">
        <div className="px-1 pb-2 pt-1">
          <div className="h-1.5 w-3/4 rounded bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="flex size-6 items-center justify-center rounded-md border bg-background">
              <Plus className="size-3 text-muted-foreground" />
            </span>
            <span className="flex size-6 items-center justify-center rounded-md border bg-background">
              <ShieldCheck className="size-3 text-muted-foreground" />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="flex size-6 items-center justify-center rounded-md border bg-background">
              <Mic className="size-3 text-muted-foreground" />
            </span>
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full',
                !primaryColor && 'bg-primary text-primary-foreground',
              )}
              style={
                primaryColor
                  ? {
                      backgroundColor: primaryColor,
                      color: primaryForeground ?? undefined,
                    }
                  : undefined
              }
            >
              <ArrowUp className="size-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TogglesSnippet({ primaryColor }: { primaryColor: string | null }) {
  return (
    <div className="flex h-full flex-col justify-center gap-3 rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs">
          <span aria-hidden="true">🇪🇺</span>
          <span>Claude Opus</span>
        </span>
        <span
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5',
            !primaryColor && 'bg-primary',
          )}
          style={primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          <span className="size-4 translate-x-4 rounded-full bg-background shadow-sm transition-transform" />
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true">🇪🇺</span>
          <span>GPT-5</span>
        </span>
        <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-muted px-0.5">
          <span className="size-4 rounded-full bg-background shadow-sm transition-transform" />
        </span>
      </div>
    </div>
  );
}
