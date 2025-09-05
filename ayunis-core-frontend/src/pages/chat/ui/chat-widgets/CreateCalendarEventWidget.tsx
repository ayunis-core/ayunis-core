// Types
import type { ToolUseMessageContent } from "../../model/openapi";
import type { CalendarEventInput } from "../../api/useGenerateIcs";

// Utils
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { showError } from "@/shared/lib/toast";

// API
import { useGenerateIcs } from "../../api/useGenerateIcs";

// Shadcn
import { Label } from "@/shared/ui/shadcn/label";
import { Input } from "@/shared/ui/shadcn/input";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import { Button } from "@/shared/ui/shadcn/button";
import { Calendar } from "@/shared/ui/shadcn/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/shadcn/popover";

// Icons
import { ChevronDownIcon } from "lucide-react";

export default function CreateCalendarEventWidget({ content }: { content: ToolUseMessageContent; }) {
  const { t } = useTranslation("chats");
  const { generate } = useGenerateIcs();

  const params = (content.params || {}) as Partial<CalendarEventInput>;

  const [title, setTitle] = useState<string>(params.title || "");
  const [description, setDescription] = useState<string>(params.description || "");
  const [location, setLocation] = useState<string>(params.location || "");
  const [startDate, setStartDate] = useState<Date | undefined>(params.start ? new Date(params.start) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(params.end ? new Date(params.end) : undefined);
  const [startTime, setStartTime] = useState<string>(params.start ? new Date(params.start).toISOString().substring(11, 19) : "10:30:00");
  const [endTime, setEndTime] = useState<string>(params.end ? new Date(params.end).toISOString().substring(11, 19) : "11:30:00");
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  function combineDateTime(d?: Date, time?: string): string | undefined {
    if (!d || !time) {
      return undefined;
    }

    const [hh = "00", mm = "00", ss = "00"] = time.split(":");
    const combined = new Date(d);
    combined.setHours(Number(hh), Number(mm), Number(ss || 0), 0);
    return combined.toISOString();
  }

  const isInvalidRange = useMemo(() => {
    const startIso = combineDateTime(startDate, startTime);
    const endIso = combineDateTime(endDate, endTime);
    if (!startIso || !endIso) {
      return false;
    }

    return new Date(endIso) <= new Date(startIso);
  }, [startDate, startTime, endDate, endTime]);

   function downloadIcs() {
    const startIso = combineDateTime(startDate, startTime);
    const endIso = combineDateTime(endDate, endTime);
    if (!title || !startIso || !endIso) {
      return;
    }

    const dto: CalendarEventInput = {
      title,
      description: description || undefined,
      location: location || undefined,
      start: startIso,
      end: endIso,
    };

    if (isInvalidRange) {
      showError(t("chat.tools.create_calendar_event.invalidRange", { defaultValue: "End must be after start" }));
      return;
    }

    const icsContent = generate(dto);
    if (!icsContent || typeof icsContent !== 'string') {
      showError(t("chat.errorUnexpected"));
      return;
    }

    const blob = new Blob([icsContent], { type: 'text/calendar; charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${title || "event"}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <div className="my-2 space-y-4 w-full" key={`${content.name}-${content.id}`}>
      <div className="space-y-2 w-full">
        <Label htmlFor={`calendar-title-${content.id}`}>{t("chat.tools.create_calendar_event.title")}</Label>
        <Input id={`calendar-title-${content.id}`} className="w-full" placeholder={t("chat.tools.create_calendar_event.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-2 w-full">
        <Label htmlFor={`calendar-description-${content.id}`}>{t("chat.tools.create_calendar_event.description")}</Label>
        <Textarea id={`calendar-description-${content.id}`} className="h-32" placeholder={t("chat.tools.create_calendar_event.descriptionPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-2 w-full">
        <Label htmlFor={`calendar-location-${content.id}`}>{t("chat.tools.create_calendar_event.location")}</Label>
        <Input id={`calendar-location-${content.id}`} className="w-full" placeholder={t("chat.tools.create_calendar_event.locationPlaceholder")} value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="space-y-2">
          <Label className="px-1">{t("chat.tools.create_calendar_event.start")}</Label>

          <div className="flex gap-4">
            <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-40 justify-between font-normal">
                  {startDate ? startDate.toLocaleDateString() : t("chat.tools.create_calendar_event.selectDate", { defaultValue: "Select date" })}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  captionLayout="dropdown"
                  onSelect={(d) => { setStartDate(d || undefined); setIsStartDatePickerOpen(false); }}
                />
              </PopoverContent>
            </Popover>

            <Input type="time" step="1" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="px-1">{t("chat.tools.create_calendar_event.end")}</Label>

          <div className="flex gap-4">
            <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-40 justify-between font-normal">
                  {endDate ? endDate.toLocaleDateString() : t("chat.tools.create_calendar_event.selectDate", { defaultValue: "Select date" })}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  captionLayout="dropdown"
                  onSelect={(d) => { setEndDate(d || undefined); setIsEndDatePickerOpen(false); }}
                />
              </PopoverContent>
            </Popover>

            <Input type="time" step="1" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" />
          </div>
        </div>
      </div>

      <div className="w-full flex gap-2">
        <Button onClick={downloadIcs} disabled={!title || !startDate || !endDate || isInvalidRange}>
          {t("chat.tools.create_calendar_event.downloadIcs")}
        </Button>
      </div>
    </div>
  );
}

