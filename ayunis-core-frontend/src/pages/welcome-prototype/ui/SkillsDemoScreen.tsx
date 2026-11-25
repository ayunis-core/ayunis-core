import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Card } from '@ayunis/ui/components/card';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Markdown } from '@ayunis/chat/markdown';
import { AssistantMessageFrame } from '@ayunis/chat/messages';
import { AyunisProgressOrb } from '@/widgets/ayunis-progress-orb';
import { MARKETPLACE_SKILLS } from '@/pages/welcome-prototype/model/welcome-prototype';
import { usePickedSet } from '@/pages/welcome-prototype/model/use-picked-set';
import { useStreamedText } from '@/pages/welcome-prototype/model/use-streamed-text';
import { ScreenShell } from './ScreenShell';

const DEMO_ANSWER = `**Vollständigkeit Bauantrag Lindenweg 12**

- Bauantragsformular: vorhanden
- Lageplan: vorhanden
- Bauzeichnungen: vorhanden
- Statischer Nachweis: **fehlt**
- Entwässerungsplan: **fehlt**

Soll Ayunis Core eine Nachforderung an die Antragstellerin formulieren?`;

type DemoPhase = 'question' | 'typing' | 'answer';

function useDemoPhase() {
  const [phase, setPhase] = useState<DemoPhase>('question');

  useEffect(() => {
    const typing = window.setTimeout(() => setPhase('typing'), 900);
    const answer = window.setTimeout(() => setPhase('answer'), 2400);
    return () => {
      window.clearTimeout(typing);
      window.clearTimeout(answer);
    };
  }, []);

  return phase;
}

function DemoAnswer() {
  const { shown, isDone } = useStreamedText(DEMO_ANSWER, true);
  return (
    <AssistantMessageFrame grouped>
      <Markdown isStreaming={!isDone}>{shown}</Markdown>
    </AssistantMessageFrame>
  );
}

export function SkillsDemoScreen({
  onDone,
  onBack,
}: Readonly<{ onDone: () => void; onBack: () => void }>) {
  const phase = useDemoPhase();
  const { picked, toggle } = usePickedSet(() => []);

  return (
    <ScreenShell
      title="Fähigkeiten erledigen Aufgaben auf Knopfdruck."
      hint="Eine Fähigkeit bündelt Anweisungen und Wissen für eine wiederkehrende Aufgabe. So sieht das aus:"
      nextLabel="Fähigkeiten hinzufügen"
      secondary={{ label: 'Überspringen', onClick: onDone }}
      onNext={onDone}
      onBack={onBack}
    >
      <div className="flex w-[40rem] max-w-full flex-col gap-6 text-left">
        <Card className="bg-background wp-demo gap-4 px-5 py-5">
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="secondary">
              <Sparkles />
              Bauanträge vorprüfen
            </Badge>
            <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm">
              Prüfe den Bauantrag Lindenweg 12 auf Vollständigkeit.
            </div>
          </div>
          {phase === 'typing' && <AyunisProgressOrb isActive />}
          {phase === 'answer' && <DemoAnswer />}
        </Card>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground px-1 text-sm">
            Passend für Sie aus dem Marketplace
          </span>
          <div className="grid gap-2 sm:grid-cols-3">
            {MARKETPLACE_SKILLS.map((skill) => (
              <Item
                key={skill.name}
                variant="outline"
                size="sm"
                className="bg-background items-start"
                asChild
              >
                <label className="cursor-pointer">
                  <Checkbox
                    checked={picked.has(skill.name)}
                    onCheckedChange={(value) =>
                      toggle(skill.name, value === true)
                    }
                  />
                  <ItemContent>
                    <ItemTitle>{skill.name}</ItemTitle>
                    <ItemDescription>{skill.description}</ItemDescription>
                  </ItemContent>
                </label>
              </Item>
            ))}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
