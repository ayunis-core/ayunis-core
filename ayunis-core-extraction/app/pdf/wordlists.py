"""hunspell dictionaries for the `wordValidity` signal (contract §8.1).

The dictionaries are data files (Debian `hunspell-de-de`, `hunspell-en-us`); spylls reads them
in pure Python with affix handling, so inflected German forms count as valid.
"""

import logging
import threading
from collections.abc import Iterable
from pathlib import Path

from spylls.hunspell import Dictionary

logger = logging.getLogger(__name__)

LANGUAGE_FILES = {"de": "de_DE", "en": "en_US"}
# Longer tokens are never dictionary words; they are counted invalid without a lookup, so no
# document-sized string reaches the dictionary or a cache.
MAX_TOKEN_LENGTH = 64
WORD_CACHE_LIMIT = 100_000


class WordCache:
    """Lookup results for one job; it dies with the job, so no document text outlives it."""

    def __init__(self, limit: int = WORD_CACHE_LIMIT) -> None:
        self.limit = limit
        self._entries: dict[tuple[str, str], bool] = {}

    def get(self, language: str, word: str) -> bool | None:
        return self._entries.get((language, word))

    def put(self, language: str, word: str, valid: bool) -> None:
        if len(self._entries) >= self.limit:
            self._entries.clear()
        self._entries[(language, word)] = valid


class _Lexicon:
    def __init__(self, name: str, dictionary: Dictionary) -> None:
        self.name = name
        self.dictionary = dictionary

    def lookup(self, word: str, cache: WordCache | None) -> bool:
        known = cache.get(self.name, word) if cache is not None else None
        if known is None:
            known = bool(self.dictionary.lookup(word))
            if cache is not None:
                cache.put(self.name, word, known)
        return known


class WordLists:
    def __init__(self, directory: Path | None) -> None:
        self.directory = directory
        self._lexicons: dict[str, _Lexicon | None] = {}
        self._lock = threading.Lock()

    def available(self, language_hints: Iterable[str]) -> bool:
        return any(self._lexicon(hint) is not None for hint in language_hints)

    def validity(
        self, tokens: list[str], language_hints: Iterable[str], cache: WordCache | None = None
    ) -> float | None:
        """Fraction of tokens found in any hinted dictionary; None when no dictionary is loaded."""
        lexicons = [lexicon for hint in language_hints if (lexicon := self._lexicon(hint))]
        if not lexicons or not tokens:
            return None
        valid = sum(
            1
            for token in tokens
            if len(token) <= MAX_TOKEN_LENGTH
            and any(lexicon.lookup(token, cache) for lexicon in lexicons)
        )
        return valid / len(tokens)

    def _lexicon(self, hint: str) -> _Lexicon | None:
        name = LANGUAGE_FILES.get(hint.lower().split("-")[0].split("_")[0])
        if name is None or self.directory is None:
            return None
        with self._lock:
            if name not in self._lexicons:
                self._lexicons[name] = self._load(name)
            return self._lexicons[name]

    def _load(self, name: str) -> _Lexicon | None:
        assert self.directory is not None
        base = self.directory / name
        if not base.with_suffix(".dic").exists() or not base.with_suffix(".aff").exists():
            logger.warning(
                "word list missing, wordValidity not evaluated", extra={"path": str(base)}
            )
            return None
        try:
            lexicon = _Lexicon(name, Dictionary.from_files(str(base)))
        except Exception as error:
            logger.warning("word list unreadable", extra={"path": str(base), "reason": str(error)})
            return None
        logger.info("word list loaded", extra={"path": str(base)})
        return lexicon
