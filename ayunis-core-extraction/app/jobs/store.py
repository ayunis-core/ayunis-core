"""Job records, claims and leases in Redis (contract §5, §6, §7).

Keys, all under the `extraction:` prefix:
  job:<id>      hash with the record fields
  key:<key>     idempotency key → job id (SET NX makes start atomic per key)
  queue         list of job ids waiting for a worker
  lease:<id>    replica id, TTL LEASE_TTL, renewed while a worker holds the job
  owner:<orgId> set of job ids, for release by owner
  jobs          set of every job id, scanned by the janitor
"""

import json
import secrets
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, cast

import redis

from app.api.models import (
    TERMINAL_STATES,
    JobFailure,
    JobProgress,
    JobStatus,
    ResultRef,
    StartJobRequest,
)

PREFIX = "extraction:"
QUEUE_KEY = f"{PREFIX}queue"
JOBS_KEY = f"{PREFIX}jobs"


def job_key(job_id: str) -> str:
    return f"{PREFIX}job:{job_id}"


def key_index(idempotency_key: str) -> str:
    return f"{PREFIX}key:{idempotency_key}"


def lease_key(job_id: str) -> str:
    return f"{PREFIX}lease:{job_id}"


def owner_key(org_id: str) -> str:
    return f"{PREFIX}owner:{org_id}"


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def new_job_id() -> str:
    return f"{int(time.time() * 1000):013x}{secrets.token_hex(6)}"


# Returns {status, jobId}. A key whose record expired before its index is treated as new.
START_SCRIPT = """
local keyIdx, jobKey, queue, ownerSet, allSet = KEYS[1], KEYS[2], KEYS[3], KEYS[4], KEYS[5]
local jobId, fingerprint, now = ARGV[1], ARGV[2], ARGV[3]
local existing = redis.call('GET', keyIdx)
if existing and redis.call('EXISTS', 'extraction:job:' .. existing) == 0 then
  redis.call('DEL', keyIdx)
  existing = nil
end
if not existing then
  redis.call('SET', keyIdx, jobId)
  local fields = cjson.decode(ARGV[4])
  for k, v in pairs(fields) do redis.call('HSET', jobKey, k, v) end
  redis.call('RPUSH', queue, jobId)
  redis.call('SADD', ownerSet, jobId)
  redis.call('SADD', allSet, jobId)
  return {'created', jobId}
end
local existingKey = 'extraction:job:' .. existing
if redis.call('HGET', existingKey, 'fingerprint') ~= fingerprint then
  return {'conflict', existing}
end
local state = redis.call('HGET', existingKey, 'state')
if state == 'failed' and redis.call('HGET', existingKey, 'retryable') == '1' then
  local attempt = tonumber(redis.call('HGET', existingKey, 'attempt')) + 1
  redis.call('HSET', existingKey, 'state', 'queued', 'attempt', attempt, 'error', '',
    'retryable', '', 'phase', '', 'finishedAt', '', 'updatedAt', now)
  redis.call('PERSIST', existingKey)
  redis.call('PERSIST', keyIdx)
  redis.call('RPUSH', queue, existing)
  return {'requeued', existing}
end
return {'existing', existing}
"""

CLAIM_SCRIPT = """
local jobKey, lease = KEYS[1], KEYS[2]
local replica, now, ttl = ARGV[1], ARGV[2], tonumber(ARGV[3])
local state = redis.call('HGET', jobKey, 'state')
if state ~= 'queued' then return state or 'missing' end
if redis.call('SET', lease, replica, 'NX', 'EX', ttl) == false then return 'leased' end
if redis.call('HGET', jobKey, 'startedAt') == '' then
  redis.call('HSET', jobKey, 'startedAt', now)
end
redis.call('HSET', jobKey, 'state', 'running', 'phase', 'downloading', 'updatedAt', now,
  'replica', replica)
return 'claimed'
"""

# Every write a worker makes is guarded by its lease: once the janitor has re-queued the job and
# another replica holds it, the previous worker's late writes are refused.
CAS_SCRIPT = """
local jobKey, lease = KEYS[1], KEYS[2]
local expected, now, replica = ARGV[1], ARGV[2], ARGV[3]
if redis.call('GET', lease) ~= replica then return 'lease_lost' end
local state = redis.call('HGET', jobKey, 'state')
if state ~= expected then return state or 'missing' end
for i = 4, #ARGV, 2 do redis.call('HSET', jobKey, ARGV[i], ARGV[i + 1]) end
redis.call('HSET', jobKey, 'updatedAt', now)
return 'ok'
"""

# A poll after release must not recreate the hash with a single field.
TOUCH_SCRIPT = """
if redis.call('EXISTS', KEYS[1]) == 1 then redis.call('HSET', KEYS[1], 'lastPolledAt', ARGV[1]) end
return 0
"""

RELEASE_LEASE_SCRIPT = """
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
"""

CANCEL_SCRIPT = """
local jobKey, queue = KEYS[1], KEYS[2]
local jobId, now = ARGV[1], ARGV[2]
local state = redis.call('HGET', jobKey, 'state')
if not state then return 'missing' end
if state == 'succeeded' or state == 'failed' or state == 'cancelled' then return state end
redis.call('LREM', queue, 0, jobId)
redis.call('HSET', jobKey, 'state', 'cancelled', 'phase', '', 'result', '', 'finishedAt', now,
  'updatedAt', now)
return 'done'
"""

RENEW_SCRIPT = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return 0
"""

REQUEUE_EXPIRED_SCRIPT = """
local jobKey, lease, queue = KEYS[1], KEYS[2], KEYS[3]
local jobId, now, maxRestarts, failure = ARGV[1], ARGV[2], tonumber(ARGV[3]), ARGV[4]
if redis.call('HGET', jobKey, 'state') ~= 'running' then return 'skip' end
if redis.call('EXISTS', lease) == 1 then return 'skip' end
local restarts = tonumber(redis.call('HGET', jobKey, 'restarts'))
if restarts >= maxRestarts then
  redis.call('HSET', jobKey, 'state', 'failed', 'phase', '', 'error', failure, 'retryable', '0',
    'finishedAt', now, 'updatedAt', now)
  return 'failed'
end
redis.call('HSET', jobKey, 'state', 'queued', 'phase', '', 'restarts', restarts + 1,
  'updatedAt', now)
redis.call('RPUSH', queue, jobId)
return 'requeued'
"""

# A worker that shuts down hands its job back without spending a restart.
YIELD_SCRIPT = """
local jobKey, lease, queue = KEYS[1], KEYS[2], KEYS[3]
local jobId, replica, now = ARGV[1], ARGV[2], ARGV[3]
if redis.call('GET', lease) ~= replica then return 'lost' end
redis.call('DEL', lease)
if redis.call('HGET', jobKey, 'state') ~= 'running' then return 'skip' end
redis.call('HSET', jobKey, 'state', 'queued', 'phase', '', 'updatedAt', now)
redis.call('RPUSH', queue, jobId)
return 'yielded'
"""


@dataclass(frozen=True)
class StartOutcome:
    status: str
    job_id: str


@dataclass(frozen=True)
class JobRecord:
    job_id: str
    request: StartJobRequest
    status: JobStatus
    retryable: bool
    replica: str
    last_polled_at: str


def _status_from_hash(raw: dict[str, str]) -> JobStatus:
    return JobStatus(
        job_id=raw["jobId"],
        idempotency_key=raw["idempotencyKey"],
        state=cast(Any, raw["state"]),
        phase=cast(Any, raw.get("phase") or None),
        attempt=int(raw["attempt"]),
        restarts=int(raw["restarts"]),
        progress=JobProgress(
            pages_total=int(raw["pagesTotal"]) if raw.get("pagesTotal") else None,
            pages_done=int(raw.get("pagesDone") or 0),
            pages_ocr=int(raw.get("pagesOcr") or 0),
            pages_text=int(raw.get("pagesText") or 0),
        ),
        result=ResultRef.model_validate_json(raw["result"]) if raw.get("result") else None,
        error=JobFailure.model_validate_json(raw["error"]) if raw.get("error") else None,
        created_at=raw["createdAt"],
        started_at=raw.get("startedAt") or None,
        updated_at=raw["updatedAt"],
        finished_at=raw.get("finishedAt") or None,
    )


def _fingerprint(request: StartJobRequest) -> str:
    return json.dumps(
        {
            "input": request.input.model_dump(by_alias=True),
            "output": request.output.model_dump(by_alias=True),
        },
        sort_keys=True,
    )


class JobStore:
    def __init__(self, client: redis.Redis, lease_ttl_seconds: int) -> None:
        self.redis = client
        self.lease_ttl_seconds = lease_ttl_seconds
        self._start = client.register_script(START_SCRIPT)
        self._claim = client.register_script(CLAIM_SCRIPT)
        self._cas = client.register_script(CAS_SCRIPT)
        self._release_lease = client.register_script(RELEASE_LEASE_SCRIPT)
        self._touch = client.register_script(TOUCH_SCRIPT)
        self._cancel = client.register_script(CANCEL_SCRIPT)
        self._renew = client.register_script(RENEW_SCRIPT)
        self._requeue_expired = client.register_script(REQUEUE_EXPIRED_SCRIPT)
        self._yield = client.register_script(YIELD_SCRIPT)

    def ping(self) -> None:
        self.redis.ping()

    # -- start, status, cancel -------------------------------------------------

    def start(self, request: StartJobRequest) -> StartOutcome:
        job_id = new_job_id()
        now = now_iso()
        fields = {
            "jobId": job_id,
            "idempotencyKey": request.idempotency_key,
            "fingerprint": _fingerprint(request),
            "request": request.model_dump_json(by_alias=True),
            "orgId": request.owner.org_id,
            "sourceId": request.owner.source_id,
            "state": "queued",
            "phase": "",
            "attempt": "1",
            "restarts": "0",
            "pagesTotal": "",
            "pagesDone": "0",
            "pagesOcr": "0",
            "pagesText": "0",
            "result": "",
            "error": "",
            "retryable": "",
            "createdAt": now,
            "startedAt": "",
            "updatedAt": now,
            "finishedAt": "",
            "lastPolledAt": now,
            "replica": "",
        }
        status, existing_id = self._start(
            keys=[
                key_index(request.idempotency_key),
                job_key(job_id),
                QUEUE_KEY,
                owner_key(request.owner.org_id),
                JOBS_KEY,
            ],
            args=[job_id, fields["fingerprint"], now, json.dumps(fields)],
        )
        return StartOutcome(status=_text(status), job_id=_text(existing_id))

    def get(self, job_id: str) -> JobRecord | None:
        raw = self._hash(job_id)
        if raw is None:
            return None
        return JobRecord(
            job_id=job_id,
            request=StartJobRequest.model_validate_json(raw["request"]),
            status=_status_from_hash(raw),
            retryable=raw.get("retryable") == "1",
            replica=raw.get("replica") or "",
            last_polled_at=raw.get("lastPolledAt") or raw["createdAt"],
        )

    def status(self, job_id: str) -> JobStatus | None:
        record = self.get(job_id)
        return record.status if record else None

    def find_by_key(self, idempotency_key: str) -> str | None:
        return _opt_text(self.redis.get(key_index(idempotency_key)))

    def state(self, job_id: str) -> str | None:
        return _opt_text(self.redis.hget(job_key(job_id), "state"))

    def touch_polled(self, job_id: str) -> None:
        self._touch(keys=[job_key(job_id)], args=[now_iso()])

    def cancel(self, job_id: str) -> str:
        return _text(self._cancel(keys=[job_key(job_id), QUEUE_KEY], args=[job_id, now_iso()]))

    def jobs_of_owner(self, org_id: str) -> list[str]:
        members = self.redis.smembers(owner_key(org_id))
        return sorted(_text(member) for member in members)

    def all_job_ids(self) -> list[str]:
        members = self.redis.smembers(JOBS_KEY)
        return sorted(_text(member) for member in members)

    def delete(self, job_id: str) -> None:
        raw = self._hash(job_id)
        pipe = self.redis.pipeline()
        if raw is not None:
            if raw.get("idempotencyKey"):
                pipe.delete(key_index(raw["idempotencyKey"]))
            if raw.get("orgId"):
                pipe.srem(owner_key(raw["orgId"]), job_id)
        pipe.delete(job_key(job_id), lease_key(job_id))
        pipe.lrem(QUEUE_KEY, 0, job_id)
        pipe.srem(JOBS_KEY, job_id)
        pipe.execute()

    # -- worker side ---------------------------------------------------------------

    def pop_queued(self, timeout_seconds: int) -> str | None:
        popped = self.redis.blpop([QUEUE_KEY], timeout=timeout_seconds)
        if popped is None:
            return None
        return _text(cast(tuple[Any, Any], popped)[1])

    def claim(self, job_id: str, replica: str) -> str:
        return _text(
            self._claim(
                keys=[job_key(job_id), lease_key(job_id)],
                args=[replica, now_iso(), self.lease_ttl_seconds],
            )
        )

    def renew_lease(self, job_id: str, replica: str) -> bool:
        return bool(self._renew(keys=[lease_key(job_id)], args=[replica, self.lease_ttl_seconds]))

    def release_lease(self, job_id: str, replica: str) -> None:
        self._release_lease(keys=[lease_key(job_id)], args=[replica])

    def yield_job(self, job_id: str, replica: str) -> str:
        return _text(
            self._yield(
                keys=[job_key(job_id), lease_key(job_id), QUEUE_KEY],
                args=[job_id, replica, now_iso()],
            )
        )

    def set_phase(self, job_id: str, phase: str, replica: str) -> str:
        return self._update_running(job_id, replica, "phase", phase)

    def set_progress(self, job_id: str, progress: JobProgress, replica: str) -> str:
        return self._update_running(
            job_id,
            replica,
            "pagesTotal",
            "" if progress.pages_total is None else str(progress.pages_total),
            "pagesDone",
            str(progress.pages_done),
            "pagesOcr",
            str(progress.pages_ocr),
            "pagesText",
            str(progress.pages_text),
        )

    def succeed(
        self, job_id: str, result: ResultRef, replica: str, record_ttl_seconds: float
    ) -> bool:
        now = now_iso()
        outcome = self._update_running(
            job_id,
            replica,
            "state",
            "succeeded",
            "phase",
            "",
            "result",
            result.model_dump_json(by_alias=True),
            "finishedAt",
            now,
        )
        if outcome == "ok":
            self._expire_terminal(job_id, record_ttl_seconds)
            return True
        return False

    def fail(
        self, job_id: str, failure: JobFailure, replica: str, record_ttl_seconds: float
    ) -> bool:
        now = now_iso()
        outcome = self._update_running(
            job_id,
            replica,
            "state",
            "failed",
            "phase",
            "",
            "error",
            failure.model_dump_json(by_alias=True),
            "retryable",
            "1" if failure.retryable else "0",
            "finishedAt",
            now,
        )
        if outcome == "ok":
            self._expire_terminal(job_id, record_ttl_seconds)
            return True
        return False

    def _update_running(self, job_id: str, replica: str, *fields: str) -> str:
        """Writes the fields only while the job is running and `replica` still holds its lease."""
        return _text(
            self._cas(
                keys=[job_key(job_id), lease_key(job_id)],
                args=["running", now_iso(), replica, *fields],
            )
        )

    # -- janitor side --------------------------------------------------------------

    def requeue_expired(self, job_id: str, max_restarts: int) -> str:
        failure = JobFailure(
            code="RESTART_LIMIT",
            message=f"Job lease expired {max_restarts} times",
            retryable=False,
        ).model_dump_json(by_alias=True)
        return _text(
            self._requeue_expired(
                keys=[job_key(job_id), lease_key(job_id), QUEUE_KEY],
                args=[job_id, now_iso(), max_restarts, failure],
            )
        )

    def is_queued_in_list(self, job_id: str) -> bool:
        return self.redis.lpos(QUEUE_KEY, job_id) is not None

    def push_back(self, job_id: str) -> None:
        self.redis.rpush(QUEUE_KEY, job_id)

    def _expire_terminal(self, job_id: str, record_ttl_seconds: float) -> None:
        raw = self._hash(job_id)
        if raw is None:
            return
        # The janitor expires records at RECORD_TTL; this only covers every replica being down.
        grace = int(record_ttl_seconds * 2)
        self.redis.expire(job_key(job_id), grace)
        self.redis.expire(key_index(raw["idempotencyKey"]), grace)

    def _hash(self, job_id: str) -> dict[str, str] | None:
        raw = self.redis.hgetall(job_key(job_id))
        if not raw:
            return None
        return {_text(key): _text(value) for key, value in raw.items()}


def _text(value: Any) -> str:
    return value.decode() if isinstance(value, bytes) else str(value)


def _opt_text(value: Any) -> str | None:
    return None if value is None else _text(value)


def is_terminal(state: str | None) -> bool:
    return state in TERMINAL_STATES
