import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Label } from '@ayunis/ui/components/label';
import { Textarea } from '@ayunis/ui/components/textarea';

export function SkillReadOnlyContent({
  trigger,
  instructions,
}: Readonly<{ trigger: string; instructions: string }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inhalt</CardTitle>
        <CardDescription>
          Sie können diese Fähigkeit nutzen, aber nicht ändern.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="readonly-trigger">Auslöser</Label>
          <Textarea id="readonly-trigger" value={trigger} disabled readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="readonly-instructions">Anweisungen</Label>
          <Textarea
            id="readonly-instructions"
            value={instructions}
            disabled
            readOnly
            rows={6}
          />
        </div>
      </CardContent>
    </Card>
  );
}
