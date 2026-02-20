import type { ReactNode } from 'react';
import { SidebarTrigger } from '@/shared/ui/shadcn/sidebar';
import { Separator } from '@/shared/ui/shadcn/separator';

interface ContentAreaHeaderProps {
  title: string | ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
}

export default function ContentAreaHeader({
  title,
  action,
  badge,
}: Readonly<ContentAreaHeaderProps>) {
  return (
    <header className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 lg:hidden">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-6"
          />
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {badge}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </header>
  );
}
