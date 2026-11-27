import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ayunis/ui/components/accordion';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import type { SuperAdminAdventCalendarDoorResponseDto } from '@ayunis/api-client/schemas';
import DoorEditor from './DoorEditor';

interface AdventCalendarDoorsCardProps {
  doors: SuperAdminAdventCalendarDoorResponseDto[];
}

export default function AdventCalendarDoorsCard({
  doors,
}: Readonly<AdventCalendarDoorsCardProps>) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const [openDoors, setOpenDoors] = useState<string[]>([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('doors.title')}</CardTitle>
        <CardDescription>{t('doors.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion
          type="multiple"
          value={openDoors}
          onValueChange={setOpenDoors}
        >
          {doors.map((door) => (
            <AccordionItem
              key={door.day}
              value={String(door.day)}
              data-testid={`advent-calendar-door-${door.day}`}
            >
              <AccordionTrigger className="items-center">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="w-24 shrink-0 whitespace-nowrap">
                    {t('doors.day', { day: door.day })}
                  </span>
                  <span
                    className={
                      door.content ? 'truncate' : 'text-muted-foreground'
                    }
                  >
                    {door.content?.title ?? t('doors.noTitle')}
                  </span>
                </span>
                <Badge variant={door.content ? 'secondary' : 'outline'}>
                  {door.content ? t('doors.filled') : t('doors.empty')}
                </Badge>
              </AccordionTrigger>
              {/* Kept mounted while collapsed, so closing a door keeps its
                  unsaved edits; forceMount alone would also keep it visible. */}
              <AccordionContent
                className="px-1"
                forceMount
                hidden={!openDoors.includes(String(door.day))}
              >
                <DoorEditor door={door} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
