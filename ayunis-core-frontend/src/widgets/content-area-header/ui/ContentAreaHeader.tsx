import { type ReactNode } from "react";

interface ContentAreaHeaderProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function ContentAreaHeader({
  title,
  icon,
  action,
}: ContentAreaHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {icon && <div className="flex items-center">{icon}</div>}
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
