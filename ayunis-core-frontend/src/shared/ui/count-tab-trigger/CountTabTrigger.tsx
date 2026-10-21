import { Badge } from '@ayunis/ui/components/badge';
import { TabsTrigger } from '@ayunis/ui/components/tabs';

export function CountTabTrigger({
  value,
  label,
  count,
  testIdPrefix,
}: Readonly<{
  value: string;
  label: string;
  count: number;
  testIdPrefix: string;
}>) {
  return (
    <TabsTrigger value={value} data-testid={`${testIdPrefix}-${value}`}>
      {label}
      <Badge variant="secondary" data-testid={`${testIdPrefix}-${value}-count`}>
        {count}
      </Badge>
    </TabsTrigger>
  );
}
