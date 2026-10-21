import secrets

from fastapi import Request

from app.errors import ServiceError


def require_token(request: Request) -> None:
    """Checked only when EXTRACTION_SERVICE_TOKEN is set.

    It guards against accidental exposure; tenant isolation is the backend's job.
    """
    expected: str | None = request.app.state.settings.service_token
    if not expected:
        return
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not secrets.compare_digest(token.strip(), expected):
        raise ServiceError("UNAUTHORIZED", "Missing or invalid bearer token", status=401)
