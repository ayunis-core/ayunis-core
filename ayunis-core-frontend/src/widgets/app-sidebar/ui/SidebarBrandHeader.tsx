import { Link } from '@tanstack/react-router';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import brandFullDark from '@/shared/assets/brand/brand-full-dark.svg';
import { useTheme } from '@/features/theme';
import { ReleaseNotesButton } from './ReleaseNotesButton';
import { NewsBellButton } from './news/NewsBellButton';

export function SidebarBrandHeader() {
  const { theme } = useTheme();
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex h-12 items-center justify-between w-full p-2">
            <Link to="/" aria-label="Ayunis Core" className="inline-flex">
              <img
                src={theme === 'dark' ? brandFullDark : brandFullLight}
                alt="Ayunis Logo"
                className="w-full max-w-32"
              />
            </Link>
            <div className="flex items-center gap-1">
              <ReleaseNotesButton />
              <NewsBellButton />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
