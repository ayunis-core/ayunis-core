import type { ReactNode } from "react";

interface ProviderConsumptionHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function ProviderConsumptionHeader({ title, description, actions }: ProviderConsumptionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

