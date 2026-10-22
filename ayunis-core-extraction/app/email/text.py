"""The flattened email shape the backend produces: a header block, a blank line, the body."""

import re
from datetime import UTC, datetime
from html.parser import HTMLParser

SKIPPED_ELEMENTS = frozenset({"script", "style", "head", "title", "template"})
# Block-level elements and the newlines html-to-text (mailparser's fallback) puts around them.
PARAGRAPH_ELEMENTS = frozenset({"p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre"})
LINE_ELEMENTS = frozenset(
    {
        "div",
        "li",
        "tr",
        "table",
        "ul",
        "ol",
        "dl",
        "dt",
        "dd",
        "section",
        "article",
        "header",
        "footer",
        "address",
        "form",
        "fieldset",
        "figure",
        "nav",
        "aside",
        "main",
        "hr",
    }
)
HEADING_ELEMENTS = frozenset({"h1", "h2", "h3", "h4", "h5", "h6"})
HORIZONTAL_RULE = "-" * 80


class _TextRenderer(HTMLParser):
    """Renders markup the way html-to-text does by default, minus its 80-column word wrap."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip_depth = 0
        self._pre_depth = 0
        self._heading_depth = 0
        self._quote_depth = 0
        self._links: list[str | None] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag in SKIPPED_ELEMENTS:
            self._skip_depth += 1
            return
        if self._skip_depth:
            return
        if tag == "br":
            self.parts.append("\n")
        elif tag == "hr":
            self.parts.append(f"\n\n{HORIZONTAL_RULE}\n\n")
        elif tag == "img":
            alt, src = attributes.get("alt") or "", attributes.get("src") or ""
            self.parts.append(f"{alt} [{src}]" if src else alt)
        elif tag == "a":
            self._links.append(attributes.get("href"))
        elif tag in PARAGRAPH_ELEMENTS:
            self.parts.append("\n\n")
            if tag in HEADING_ELEMENTS:
                self._heading_depth += 1
            elif tag == "pre":
                self._pre_depth += 1
            elif tag == "blockquote":
                self._quote_depth += 1
        elif tag in LINE_ELEMENTS:
            self.parts.append("\n")
            if tag == "li":
                self.parts.append(" * ")
        elif tag == "td" or tag == "th":
            self.parts.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in SKIPPED_ELEMENTS:
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if self._skip_depth:
            return
        if tag == "a" and self._links:
            href = self._links.pop()
            if href and not href.startswith("mailto:"):
                self.parts.append(f" [{href}]")
        elif tag in PARAGRAPH_ELEMENTS:
            self.parts.append("\n\n")
            if tag in HEADING_ELEMENTS:
                self._heading_depth = max(0, self._heading_depth - 1)
            elif tag == "pre":
                self._pre_depth = max(0, self._pre_depth - 1)
            elif tag == "blockquote":
                self._quote_depth = max(0, self._quote_depth - 1)
        elif tag in LINE_ELEMENTS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        if not self._pre_depth:
            data = re.sub(r"\s+", " ", data)
        if self._heading_depth:
            data = data.upper()
        if self._quote_depth:
            data = data.replace("\n", "\n> ")
            if self.parts and self.parts[-1].endswith("\n\n"):
                data = "> " + data
        self.parts.append(data)


def html_to_text(html: str) -> str:
    renderer = _TextRenderer()
    renderer.feed(html)
    renderer.close()
    lines = [line.strip() for line in "".join(renderer.parts).split("\n")]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def extract_body(text: str | None, html: str | None) -> str:
    plain = (text or "").strip()
    if plain:
        return plain
    return html_to_text(html) if html else ""


def build_header_lines(fields: list[tuple[str, str]]) -> str:
    return "\n".join(f"{label}: {value}" for label, value in fields if value)


def join_sections(sections: list[str]) -> str:
    return "\n\n".join(section for section in sections if section)


def format_address(name: str | None, address: str | None, quote_name: bool = False) -> str:
    """`Name <address>`; mailparser additionally quotes the display name."""
    if not address:
        return name or ""
    if not name or name == address:
        return address
    shown = f'"{name}"' if quote_name else name
    return f"{shown} <{address}>"


def iso_timestamp(moment: datetime | None) -> str:
    """JavaScript's `toISOString`: UTC with milliseconds."""
    if moment is None:
        return ""
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    moment = moment.astimezone(UTC)
    return moment.strftime("%Y-%m-%dT%H:%M:%S.") + f"{moment.microsecond // 1000:03d}Z"
