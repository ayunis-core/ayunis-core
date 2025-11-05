interface UsageBlockHeaderProps {
  title: string;
  description: string;
}

export function UsageBlockHeader({ title, description }: UsageBlockHeaderProps) {
  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}