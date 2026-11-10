import { Play, Plus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Switch } from '@ayunis/ui/components/switch';
import { Label } from '@ayunis/ui/components/label';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';
import { cn } from '@ayunis/ui/lib/cn';
import {
  SAMPLE_CATEGORIES,
  SAMPLE_STATUSES,
  useReadOverrides,
  useSampleArrivals,
  useSampleCategories,
  useSampleHasRoutines,
  useSampleStatus,
  useSeenIds,
  type SampleStatus,
} from '@/shared/lib/prototype-settings';

const LABEL_CLASS = 'w-24 shrink-0 text-xs text-muted-foreground';

function CategoryToggles() {
  const [categories, toggle] = useSampleCategories();
  return (
    <div className="flex items-center gap-2">
      <span className={LABEL_CLASS}>Inhalt</span>
      <div className="flex gap-1">
        {SAMPLE_CATEGORIES.map((category) => {
          const isOn = categories.has(category.id);
          return (
            <Button
              key={category.id}
              variant="outline"
              size="sm"
              aria-pressed={isOn}
              onClick={() => toggle(category.id)}
              className={cn(
                'h-7 text-xs',
                isOn
                  ? 'border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background'
                  : 'text-muted-foreground',
              )}
            >
              {category.label}
            </Button>
          );
        })}
      </div>
      <RoutinesSwitch />
    </div>
  );
}

function RoutinesSwitch() {
  const [hasRoutines, setHasRoutines] = useSampleHasRoutines();
  return (
    <div className="ml-2 flex items-center gap-2">
      <Switch
        id="sample-has-routines"
        checked={hasRoutines}
        onCheckedChange={setHasRoutines}
      />
      <Label htmlFor="sample-has-routines" className="text-xs">
        Routinen angelegt
      </Label>
    </div>
  );
}

function StatusRow() {
  const [status, setStatus] = useSampleStatus();
  const [arrivals, addArrival, resetArrivals] = useSampleArrivals();
  const [seenIds, , resetSeen] = useSeenIds();
  const { resetOverrides } = useReadOverrides();
  return (
    <div className="flex items-center gap-2">
      <span className={LABEL_CLASS}>Gerade</span>
      <Tabs
        value={status}
        onValueChange={(next) => setStatus(next as SampleStatus)}
      >
        <TabsList>
          {SAMPLE_STATUSES.map((option) => (
            <TabsTrigger key={option.id} value={option.id}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={addArrival}
      >
        <Plus />
        Neuer Eintrag
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => {
          setStatus('running');
          window.setTimeout(() => {
            setStatus('none');
            addArrival();
          }, 5000);
        }}
      >
        <Play />
        Live-Lauf
      </Button>
      {(arrivals > 0 || seenIds.size > 0) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => {
            resetArrivals();
            resetSeen();
            resetOverrides();
          }}
        >
          Zurücksetzen
        </Button>
      )}
    </div>
  );
}

export function SampleControls() {
  return (
    <>
      <CategoryToggles />
      <StatusRow />
    </>
  );
}
