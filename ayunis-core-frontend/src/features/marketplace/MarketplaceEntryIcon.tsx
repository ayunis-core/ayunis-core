import type { LucideIcon } from 'lucide-react';
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic';

interface MarketplaceEntryIconProps {
  iconName: string | null | undefined;
  fallback: LucideIcon;
  className?: string;
}

export function MarketplaceEntryIcon({
  iconName,
  fallback: Fallback,
  className,
}: Readonly<MarketplaceEntryIconProps>) {
  if (!isIconName(iconName)) return <Fallback className={className} />;
  return (
    <DynamicIcon
      name={iconName}
      fallback={() => <Fallback className={className} />}
      className={className}
    />
  );
}

function isIconName(name: string | null | undefined): name is IconName {
  return !!name && (iconNames as string[]).includes(name);
}
