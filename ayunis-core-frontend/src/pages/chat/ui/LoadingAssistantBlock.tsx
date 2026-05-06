import { Avatar, AvatarFallback } from '@/shared/ui/shadcn/avatar';
import { useTheme } from '@/features/theme';
import brandIconLight from '@/shared/assets/brand/brand-icon-round-light.svg';
import brandIconDark from '@/shared/assets/brand/brand-icon-round-dark.svg';

export default function LoadingAssistantBlock() {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col items-start gap-2 mt-4">
      <Avatar className="h-8 w-8 animate-pulse">
        <AvatarFallback>
          <img
            src={theme === 'dark' ? brandIconDark : brandIconLight}
            alt="Ayunis Logo"
            className="h-8 w-8 object-contain"
          />
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
