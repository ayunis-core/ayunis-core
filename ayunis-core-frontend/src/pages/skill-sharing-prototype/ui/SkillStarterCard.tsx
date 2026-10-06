import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Input } from '@ayunis/ui/components/input';
import { STARTER_EXAMPLES } from '@/widgets/sharing-prototype/model/starter-fixtures';
import { useStartGuidedCreation } from '@/pages/skill-sharing-prototype/model/useStartGuidedCreation';

export function SkillStarterCard() {
  const [topic, setTopic] = useState('');
  const start = useStartGuidedCreation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Was erledigen Sie immer wieder?</CardTitle>
        <CardDescription>
          Beschreiben Sie es in einem Satz. Ayunis Core stellt ein paar Fragen
          und legt die Fähigkeit für Sie an.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            start(topic);
          }}
        >
          <Input
            aria-label="Was erledigen Sie immer wieder?"
            placeholder="Zum Beispiel: Antworten auf Anfragen zu Baugenehmigungen"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />
          <Button type="submit">
            Loslegen
            <ArrowRight />
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {STARTER_EXAMPLES.map((example) => (
            <Button
              key={example}
              size="xs"
              variant="outline"
              onClick={() => setTopic(example)}
            >
              {example}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
