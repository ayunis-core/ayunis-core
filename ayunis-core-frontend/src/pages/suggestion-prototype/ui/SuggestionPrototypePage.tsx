import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { RotateCcw } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import {
  SCENARIOS,
  SCENARIO_KEYS,
  parseScenarioKey,
  type ScenarioKey,
} from '@/pages/suggestion-prototype/model/scenarios';
import { PrototypeChat } from '@/pages/suggestion-prototype/ui/PrototypeChat';

export function SuggestionPrototypePage({
  kind,
}: Readonly<{ kind: ScenarioKey }>) {
  const [resetCount, setResetCount] = useState(0);

  return (
    <PrototypeChat
      key={`${kind}-${resetCount}`}
      scenario={SCENARIOS[kind]}
      header={
        <PrototypeHeader
          kind={kind}
          onReset={() => setResetCount((count) => count + 1)}
        />
      }
    />
  );
}

function PrototypeHeader({
  kind,
  onReset,
}: Readonly<{ kind: ScenarioKey; onReset: () => void }>) {
  const navigate = useNavigate();

  return (
    <ContentAreaHeader
      breadcrumbs={[{ label: 'Prototyp: Vorschläge' }]}
      action={
        <>
          <Tabs
            value={kind}
            onValueChange={(value) =>
              void navigate({
                to: '/prototype/suggestions',
                search: { kind: parseScenarioKey(value) },
              })
            }
          >
            <TabsList>
              {SCENARIO_KEYS.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {SCENARIOS[value].tabLabel}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onReset}
            aria-label="Zurücksetzen"
          >
            <RotateCcw />
          </Button>
        </>
      }
    />
  );
}
