"""RFC 822 messages flattened like the backend's `parseEml` (mailparser)."""

from dataclasses import dataclass
from email import message_from_bytes, policy
from email.message import EmailMessage, Message
from email.utils import getaddresses, parsedate_to_datetime
from typing import cast

from app.email.text import (
    build_header_lines,
    extract_body,
    format_address,
    iso_timestamp,
    join_sections,
)

BODY_CONTENT_TYPES = frozenset({"text/plain", "text/html"})


@dataclass(frozen=True)
class EmailAttachment:
    filename: str
    content_type: str
    content: bytes


@dataclass(frozen=True)
class ParsedEmail:
    text: str
    attachments: list[EmailAttachment]
    # True when the message carried more named parts than `max_attachments`; the rest were
    # neither listed nor kept.
    truncated: bool = False


DEFAULT_MAX_ATTACHMENTS = 1000


def parse_eml(data: bytes, max_attachments: int = DEFAULT_MAX_ATTACHMENTS) -> ParsedEmail:
    """A message of a million tiny named parts must not become a million attachments: the walk
    stops after `max_attachments` named parts."""
    message = message_from_bytes(data, policy=policy.default)
    attachments, truncated = _attachments(message, max_attachments)
    header = build_header_lines(
        [
            ("From", _addresses(message, "From")),
            ("To", _addresses(message, "To")),
            ("Cc", _addresses(message, "Cc")),
            ("Subject", _header(message, "Subject")),
            ("Date", _date(message)),
            ("Attachments", ", ".join(attachment.filename for attachment in attachments)),
        ]
    )
    body = extract_body(_body(message, "plain"), _body(message, "html"))
    return ParsedEmail(join_sections([header, body]), attachments, truncated)


def _header(message: EmailMessage, name: str) -> str:
    try:
        value = message.get(name)
    except (LookupError, ValueError):
        return ""
    return str(value) if value is not None else ""


def _addresses(message: EmailMessage, name: str) -> str:
    try:
        raw = message.get_all(name, [])
    except (LookupError, ValueError):
        return ""
    pairs = getaddresses([str(value) for value in raw])
    return ", ".join(
        formatted for formatted in (format_address(n, a, True) for n, a in pairs) if formatted
    )


def _date(message: EmailMessage) -> str:
    raw = _header(message, "Date")
    if not raw:
        return ""
    try:
        return iso_timestamp(parsedate_to_datetime(raw))
    except (TypeError, ValueError):
        return ""


def _body(message: EmailMessage, kind: str) -> str | None:
    """Every non-attachment part of the kind, in order, like mailparser's `text` and `html`."""
    parts: list[str] = []
    for part in _leaves(message):
        if _is_attachment(part) or part.get_content_type() != f"text/{kind}":
            continue
        parts.append(_decode(part).replace("\r\n", "\n"))
    return "\n".join(parts) if parts else None


def _attachments(message: EmailMessage, limit: int) -> tuple[list[EmailAttachment], bool]:
    found: list[EmailAttachment] = []
    for part in _leaves(message):
        if not _is_attachment(part):
            continue
        filename = part.get_filename()
        if not filename:
            continue
        if len(found) >= limit:
            return found, True
        found.append(EmailAttachment(filename, part.get_content_type(), _content(part)))
    return found, False


def _content(part: EmailMessage) -> bytes:
    if part.get_content_type() == "message/rfc822":
        embedded = part.get_payload()
        if isinstance(embedded, list) and embedded and isinstance(embedded[0], Message):
            return embedded[0].as_bytes()
        return b""
    payload = part.get_payload(decode=True)
    return payload if isinstance(payload, bytes) else b""


def _leaves(message: Message) -> list[EmailMessage]:
    """Body and attachment parts; an attached message counts as one attachment, unopened."""
    leaves: list[EmailMessage] = []

    def visit(part: Message, is_root: bool) -> None:
        if part.get_content_type() == "message/rfc822" and not is_root:
            leaves.append(cast(EmailMessage, part))
        elif part.is_multipart():
            for child in part.get_payload():
                if isinstance(child, Message):
                    visit(child, False)
        else:
            leaves.append(cast(EmailMessage, part))

    visit(message, True)
    return leaves


def _is_attachment(part: EmailMessage) -> bool:
    """mailparser: a part is an attachment unless it is an inline text/plain or text/html."""
    if part.get_content_disposition() == "attachment":
        return True
    return part.get_content_type() not in BODY_CONTENT_TYPES


def _decode(part: EmailMessage) -> str:
    try:
        content = part.get_content()
    except (LookupError, ValueError, UnicodeDecodeError):
        payload = part.get_payload(decode=True)
        raw = payload if isinstance(payload, bytes) else b""
        return raw.decode("utf-8", "replace")
    return str(content) if not isinstance(content, str) else content
