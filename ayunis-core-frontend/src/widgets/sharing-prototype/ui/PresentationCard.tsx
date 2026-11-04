import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ListOrdered,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Card } from '@ayunis/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { cn } from '@ayunis/ui/lib/cn';
import { personForRole } from '@/widgets/sharing-prototype/model/access';
import { ROLE_LABEL } from '@/widgets/sharing-prototype/model/fixtures';
import {
  ITERATION_LABEL,
  journeyFor,
} from '@/widgets/sharing-prototype/model/journey';
import {
  resetPrototype,
  setPrototypeIteration,
  setPrototypeRole,
  setPrototypeStep,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type { Iteration, Role } from '@/widgets/sharing-prototype/model/types';

const ITERATIONS: Iteration[] = [1, 2];

const ITERATION_HINT: Record<Iteration, string> = {
  1: 'Rollen, Team-Admins, Fähigkeiten für Team und Organisation. Teilen bleibt wie heute.',
  2: 'Dazu Übergeben statt Teilen und Arbeitsbereiche mit Verknüpfen und Freigaben.',
};

function rolesFor(iteration: Iteration): Role[] {
  return iteration === 1
    ? ['member', 'teamAdmin', 'orgAdmin']
    : ['member', 'teamAdmin', 'orgAdmin', 'workspaceOwner'];
}

function useJourney() {
  const { iteration } = usePrototypeState();
  return journeyFor(iteration);
}

function useGoToStep(): (step: number) => void {
  const router = useRouter();
  const journey = useJourney();
  return (step) => {
    const target = journey[step];
    setPrototypeStep(step, target.role);
    router.history.push(target.path);
  };
}

function IterationSwitch() {
  const router = useRouter();
  const { iteration } = usePrototypeState();

  const switchTo = (next: Iteration) => {
    if (next === iteration) return;
    const first = journeyFor(next)[0];
    setPrototypeIteration(next, first.role);
    router.history.push(first.path);
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">Umfang</span>
      <div className="grid grid-cols-2 gap-1">
        {ITERATIONS.map((candidate) => (
          <Button
            key={candidate}
            size="sm"
            variant={candidate === iteration ? 'secondary' : 'ghost'}
            className={cn(
              'justify-start',
              candidate === iteration && 'ring-1 ring-border',
            )}
            onClick={() => switchTo(candidate)}
          >
            {ITERATION_LABEL[candidate]}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {ITERATION_HINT[iteration]}
      </p>
    </div>
  );
}

function RoleSwitch() {
  const { role, iteration } = usePrototypeState();
  const person = personForRole(role);

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">
        Ansicht als
      </span>
      <div className="grid grid-cols-2 gap-1">
        {rolesFor(iteration).map((candidate) => (
          <Button
            key={candidate}
            size="sm"
            variant={candidate === role ? 'secondary' : 'ghost'}
            className={cn(
              'justify-start',
              candidate === role && 'ring-1 ring-border',
            )}
            onClick={() => setPrototypeRole(candidate)}
          >
            {ROLE_LABEL[candidate]}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Angemeldet als {person.name} · {person.department}
      </p>
    </div>
  );
}

function StepMenu() {
  const { step } = usePrototypeState();
  const goToStep = useGoToStep();
  const journey = useJourney();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Alle Schritte">
          <ListOrdered />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {journey.map((candidate, index) => (
          <DropdownMenuItem
            key={candidate.label}
            onSelect={() => goToStep(index)}
            className={cn(index === step && 'font-medium')}
          >
            {index + 1}. {candidate.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={resetPrototype}>
          <RotateCcw />
          Beispieldaten zurücksetzen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StepNavigation() {
  const { step } = usePrototypeState();
  const goToStep = useGoToStep();
  const journey = useJourney();
  const current = journey[step];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Schritt {step + 1} von {journey.length}
        </span>
        <div className="flex items-center gap-1">
          <StepMenu />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Vorheriger Schritt"
            disabled={step === 0}
            onClick={() => goToStep(step - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Nächster Schritt"
            disabled={step === journey.length - 1}
            onClick={() => goToStep(step + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">{current.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{current.hint}</p>
      </div>
    </div>
  );
}

export function PresentationCard() {
  const [isOpen, setIsOpen] = useState(true);
  const { step, role, iteration } = usePrototypeState();
  const journey = journeyFor(iteration);

  return (
    <Card className="fixed right-4 bottom-4 z-50 w-[22rem] gap-0 p-3 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">
          {isOpen
            ? 'Präsentation'
            : `${ITERATION_LABEL[iteration]} · ${step + 1}. ${journey[step].label} · ${ROLE_LABEL[role]}`}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isOpen ? 'Einklappen' : 'Ausklappen'}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <ChevronDown /> : <ChevronUp />}
        </Button>
      </div>
      {isOpen && (
        <div className="mt-3 space-y-4">
          <IterationSwitch />
          <div className="border-t pt-3">
            <StepNavigation />
          </div>
          <div className="border-t pt-3">
            <RoleSwitch />
          </div>
        </div>
      )}
    </Card>
  );
}
