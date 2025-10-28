// Utils
import React from "react";
import { cn } from "@/shared/lib/shadcn/utils";

// UI
import { Switch } from "@/shared/ui/shadcn/switch";

interface OnboardingModelSwitcherProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  interactive?: boolean;
  className?: string;
}

export function OnboardingModelSwitcher({
  icon,
  title,
  subtitle,
  checked,
  defaultChecked,
  onCheckedChange,
  className,
}: OnboardingModelSwitcherProps) {
  const isControlled = typeof checked !== "undefined";

  return (
    <div
      className={cn(
        "flex items-center justify-between w-full rounded-3xl bg-white px-5 py-3 shadow-lg ring-1 ring-black/5",
        className,
      )}
      role="group"
    >
      <div className="flex items-center gap-4 min-w-0">
        {icon && <div className="shrink-0 text-4xl">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-black text-xs font-medium">{title}</h3>
          {subtitle && (
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          )}
        </div>
      </div>

      <Switch
        checked={isControlled ? checked : undefined}
        defaultChecked={!isControlled ? defaultChecked : undefined}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export default OnboardingModelSwitcher;


