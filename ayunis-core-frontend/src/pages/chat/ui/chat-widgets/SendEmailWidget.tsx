import { useMemo, useState } from "react";
import type { ToolUseMessageContent } from "../../model/openapi";
import { useTranslation } from "react-i18next";
import { Label } from "@/shared/ui/shadcn/label";
import { Input } from "@/shared/ui/shadcn/input";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import { Button } from "@/shared/ui/shadcn/button";
import { Mail } from "lucide-react";

export default function SendEmailWidget({
  content,
}: {
  content: ToolUseMessageContent;
}) {
  const { t } = useTranslation("chats");
  const params = (content.params || {}) as {
    subject?: string;
    body?: string;
  };
  const [subject, setSubject] = useState<string>(params.subject || "");
  const [body, setBody] = useState<string>(params.body || "");

  const mailtoHref = useMemo(() => {
    const s = encodeURIComponent(subject || "");
    const b = encodeURIComponent(body || "");
    return `mailto:?subject=${s}&body=${b}`;
  }, [subject, body]);

  return (
    <div
      className="my-2 space-y-4 w-full"
      key={`${content.name}-${content.id}`}
    >
      <div className="space-y-2 w-full">
        <Label htmlFor={`send-email-subject-${content.id}`}>
          {t("chat.tools.send_email.subject")}
        </Label>
        <Input
          className="w-full"
          id={`send-email-subject-${content.id}`}
          placeholder="Enter email subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div className="space-y-2 w-full">
        <Label htmlFor={`send-email-body-${content.id}`}>
          {t("chat.tools.send_email.body")}
        </Label>
        <Textarea
          id={`send-email-body-${content.id}`}
          placeholder="Write your email body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-32"
        />
      </div>
      <div className="w-full">
        <Button asChild>
          <a href={mailtoHref} target="_blank" rel="noopener noreferrer">
            <Mail className="h-4 w-4" /> {t("chat.tools.send_email.open")}
          </a>
        </Button>
      </div>
    </div>
  );
}
