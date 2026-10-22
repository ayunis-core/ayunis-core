"""Child-process entry for `parse_msg_bounded`: `python -m app.email.msg_worker <path> <bytes>`.

Prints `{"text": ...}` or `{"error": ...}`; exits 3 when the memory cap is hit.
"""

import json
import resource
import sys
from pathlib import Path


def cap_memory(memory_bytes: int) -> None:
    """Lowers the address-space soft limit; enforced on Linux, where the service runs."""
    _, hard = resource.getrlimit(resource.RLIMIT_AS)
    soft = memory_bytes if hard == resource.RLIM_INFINITY else min(memory_bytes, hard)
    try:
        resource.setrlimit(resource.RLIMIT_AS, (soft, hard))
    except (ValueError, OSError) as error:
        sys.stderr.write(f"memory cap not applied: {error}\n")


def main(argv: list[str]) -> int:
    path, memory_bytes = Path(argv[1]), int(argv[2])
    cap_memory(memory_bytes)
    try:
        from app.email.msg import extract_text_from_msg

        text = extract_text_from_msg(path)
    except MemoryError:
        return 3
    except Exception as error:
        sys.stdout.write(json.dumps({"error": f"{type(error).__name__}: {error}"}))
        return 0
    sys.stdout.write(json.dumps({"text": text}))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
