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
    to?: string;
  };
  const [subject, setSubject] = useState<string>(params.subject || "");
  const [body, setBody] = useState<string>(params.body || "");
  const [to, setTo] = useState<string>(params.to || "");
  const [copied, setCopied] = useState<boolean>(false);

  const mailtoHref = useMemo(() => {
    const mailtoPath = to ? encodeURIComponent(to) : "";

    // Normalize line breaks, then force CRLF in the percent-encoded output for maximum client compatibility
    const normalizedBody = (body || "").replace(/\r\n|\r|\n/g, "\n");
    const encodedBodyWithCrlf = encodeURIComponent(normalizedBody).replace(
      /%0A/g,
      "%0D%0A",
    );
    const queryParams: string[] = [];
    if ((subject || "").length > 0) {
      queryParams.push(`subject=${encodeURIComponent(subject)}`);
    }
    if (normalizedBody.length > 0) {
      queryParams.push(`body=${encodedBodyWithCrlf}`);
    }
    const query = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    return `mailto:${mailtoPath}${query}`;
  }, [subject, body, to]);

  return (
    <div
      className="my-2 space-y-4 w-full"
      key={`${content.name}-${content.id}`}
    >
      <div className="space-y-2 w-full">
        <Label htmlFor={`send-email-to-${content.id}`}>
          {t("chat.tools.send_email.to")}
        </Label>
        <Input
          className="w-full"
          id={`send-email-to-${content.id}`}
          placeholder={t("chat.tools.send_email.toPlaceholder")}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <div className="space-y-2 w-full">
        <Label htmlFor={`send-email-subject-${content.id}`}>
          {t("chat.tools.send_email.subject")}
        </Label>
        <Input
          className="w-full"
          id={`send-email-subject-${content.id}`}
          placeholder={t("chat.tools.send_email.subjectPlaceholder")}
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
          placeholder={t("chat.tools.send_email.bodyPlaceholder")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="h-40"
        />
      </div>
      <div className="w-full flex gap-2">
        <Button asChild>
          <a href={mailtoHref} target="_blank" rel="noopener noreferrer">
            <Mail className="h-4 w-4" /> {t("chat.tools.send_email.open")}
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(body);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch (e) {
              // noop
            }
          }}
        >
          {copied
            ? t("chat.tools.send_email.copied")
            : t("chat.tools.send_email.copyBody")}
        </Button>
      </div>
    </div>
  );
}
