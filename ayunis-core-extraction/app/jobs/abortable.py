"""Runs a provider call on its own thread while the job keeps checking its state (contract §7.1)."""

import threading
from typing import Any, Protocol, TypeVar, cast

from app.jobs.runtime import JobContext

CALL_POLL_SECONDS = 1.0
ABORT_GRACE_SECONDS = 5.0

T = TypeVar("T", covariant=True)


class AbortableCall(Protocol[T]):
    """One provider exchange; `abort` tears down its connection from any thread."""

    def run(self) -> T: ...

    def abort(self) -> None: ...


def call_abortable(context: JobContext, call: AbortableCall[T]) -> T:
    """A cancel, release, lost lease or shutdown interrupts the job at once: the call's
    connection is closed so the upload stops, its result is dropped, and the worker waits briefly
    for the thread so the request buffers are freed before it moves on."""
    outcome: list[tuple[str, Any]] = []
    done = threading.Event()

    def runner() -> None:
        try:
            outcome.append(("ok", call.run()))
        except BaseException as error:
            outcome.append(("error", error))
        finally:
            done.set()

    threading.Thread(target=runner, name="provider-call", daemon=True).start()
    while not done.wait(CALL_POLL_SECONDS):
        try:
            context.check()
        except BaseException:
            call.abort()
            done.wait(ABORT_GRACE_SECONDS)
            raise
    kind, value = outcome[0]
    if kind == "error":
        raise value
    return cast(T, value)
