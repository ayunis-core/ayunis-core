
// Utils
import * as React from "react";
import { cn } from "@/shared/lib/shadcn/utils";

// UI
import { ChartContainer, type ChartConfig } from "@/shared/ui/shadcn/chart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/shared/ui/shadcn/card";

type ChartCardProps = {
  title?: string;
  insight?: string;
  config: ChartConfig;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  className?: string;
  children: React.ComponentProps<typeof ChartContainer>["children"];
};

export function ChartCard({
  title,
  insight,
  config,
  containerClassName,
  containerStyle,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("my-2", className)}>
      {title && (
        <CardHeader className="border-b">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}

      <CardContent className="overflow-auto">
        <ChartContainer
          className={containerClassName}
          style={containerStyle}
          config={config}
        >
          {children}
        </ChartContainer>
      </CardContent>

      {insight && insight.trim() && (
        <CardFooter className="border-t">
          <p className="text-sm text-muted-foreground">{insight}</p>
        </CardFooter>
      )}
    </Card>
  );
}


