import { Label } from '@ayunis/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import type { OwnerOption } from '@/pages/skill-sharing-prototype/lib/owner-options';

export function OwnerField({
  options,
  value,
  onChange,
}: Readonly<{
  options: OwnerOption[];
  value: OwnerOption;
  onChange: (value: string) => void;
}>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="skill-owner">Gehört</Label>
      <Select value={value.value} onValueChange={onChange}>
        <SelectTrigger id="skill-owner" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{value.hint}</p>
    </div>
  );
}
