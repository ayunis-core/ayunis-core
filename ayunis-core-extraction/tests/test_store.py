from app.api.models import JobFailure, JobProgress, ResultRef
from app.jobs.store import JobStore
from tests.conftest import start_request

RESULT = ResultRef(bucket="ayunis", key="x/result.json", bytes=10, sha256="r" * 64, page_count=3)


def test_start_is_atomic_per_key(store: JobStore) -> None:
    first = store.start(start_request())
    second = store.start(start_request())

    assert first.status == "created"
    assert second == second.__class__(status="existing", job_id=first.job_id)
    assert store.all_job_ids() == [first.job_id]
    assert store.pop_queued(1) == first.job_id
    assert store.pop_queued(1) is None


def test_same_key_with_other_input_conflicts(store: JobStore) -> None:
    first = store.start(start_request())

    other = store.start(start_request(key="org/processing/src/other.pdf"))

    assert other.status == "conflict"
    assert other.job_id == first.job_id


def test_retryable_failure_is_requeued_in_place_with_checkpoints_kept(store: JobStore) -> None:
    created = store.start(start_request())
    store.claim(created.job_id, "r1")
    store.set_progress(
        created.job_id, JobProgress(pages_total=10, pages_done=4, pages_ocr=0, pages_text=4), "r1"
    )
    store.fail(
        created.job_id, JobFailure(code="OCR_UNAVAILABLE", message="d", retryable=True), "r1", 60
    )

    requeued = store.start(start_request())
    status = store.status(created.job_id)

    assert requeued.status == "requeued"
    assert status is not None
    assert (status.state, status.attempt, status.error) == ("queued", 2, None)
    assert status.progress.pages_done == 4
    assert store.pop_queued(1) == created.job_id


def test_final_failure_and_cancelled_jobs_are_returned_unchanged(store: JobStore) -> None:
    final = store.start(start_request())
    store.pop_queued(1)
    store.claim(final.job_id, "r1")
    store.fail(
        final.job_id,
        JobFailure(code="UNPROCESSABLE_DOCUMENT", message="x", retryable=False),
        "r1",
        60,
    )
    cancelled = store.start(start_request(source_id="f0000000-0000-0000-0000-000000000002"))
    store.pop_queued(1)
    store.cancel(cancelled.job_id)

    assert store.start(start_request()).status == "existing"
    assert (
        store.start(start_request(source_id="f0000000-0000-0000-0000-000000000002")).status
        == "existing"
    )
    assert store.pop_queued(1) is None


def test_claim_takes_the_lease_and_only_claims_queued_jobs(store: JobStore) -> None:
    created = store.start(start_request())

    assert store.claim(created.job_id, "r1") == "claimed"
    assert store.claim(created.job_id, "r2") == "running"
    status = store.status(created.job_id)
    assert status is not None
    assert (status.state, status.phase) == ("running", "downloading")
    assert status.started_at is not None
    assert store.renew_lease(created.job_id, "r1") is True
    assert store.renew_lease(created.job_id, "r2") is False


def test_cancel_removes_a_queued_job_from_the_queue(store: JobStore) -> None:
    created = store.start(start_request())

    assert store.cancel(created.job_id) == "done"
    assert store.cancel(created.job_id) == "cancelled"
    assert store.pop_queued(1) is None
    assert store.cancel("missing") == "missing"


def test_succeed_is_a_compare_and_set_that_loses_to_cancel(store: JobStore) -> None:
    created = store.start(start_request())
    store.claim(created.job_id, "r1")
    store.cancel(created.job_id)

    assert store.succeed(created.job_id, RESULT, "r1", 60) is False
    status = store.status(created.job_id)
    assert status is not None
    assert (status.state, status.result) == ("cancelled", None)


def test_writes_are_refused_once_another_replica_holds_the_lease(store: JobStore) -> None:
    created = store.start(start_request())
    store.pop_queued(1)
    store.claim(created.job_id, "r1")
    store.release_lease(created.job_id, "r1")
    store.requeue_expired(created.job_id, 2)
    store.pop_queued(1)
    assert store.claim(created.job_id, "r2") == "claimed"

    progress = JobProgress(pages_total=3, pages_done=1, pages_ocr=0, pages_text=1)
    failure = JobFailure(code="INTERNAL", message="x", retryable=False)
    assert store.set_progress(created.job_id, progress, "r1") == "lease_lost"
    assert store.set_phase(created.job_id, "finalizing", "r1") == "lease_lost"
    assert store.succeed(created.job_id, RESULT, "r1", 60) is False
    assert store.fail(created.job_id, failure, "r1", 60) is False
    store.release_lease(created.job_id, "r1")
    assert store.renew_lease(created.job_id, "r2") is True
    status = store.status(created.job_id)
    assert status is not None
    assert (status.state, status.progress.pages_done, status.result) == ("running", 0, None)
    assert store.set_progress(created.job_id, progress, "r2") == "ok"
    assert store.succeed(created.job_id, RESULT, "r2", 60) is True


def test_expired_lease_requeues_until_the_restart_limit(store: JobStore) -> None:
    created = store.start(start_request())
    store.pop_queued(1)
    store.claim(created.job_id, "r1")

    assert store.requeue_expired(created.job_id, 2) == "skip"
    store.release_lease(created.job_id, "r1")
    assert store.requeue_expired(created.job_id, 2) == "requeued"
    assert store.pop_queued(1) == created.job_id
    store.claim(created.job_id, "r1")
    store.release_lease(created.job_id, "r1")
    assert store.requeue_expired(created.job_id, 2) == "requeued"
    store.pop_queued(1)
    store.claim(created.job_id, "r1")
    store.release_lease(created.job_id, "r1")
    assert store.requeue_expired(created.job_id, 2) == "failed"

    status = store.status(created.job_id)
    assert status is not None
    assert status.restarts == 2
    assert status.error is not None
    assert (status.error.code, status.error.retryable) == ("RESTART_LIMIT", False)


def test_yield_hands_the_job_back_without_a_restart(store: JobStore) -> None:
    created = store.start(start_request())
    store.pop_queued(1)
    store.claim(created.job_id, "r1")

    assert store.yield_job(created.job_id, "r2") == "lost"
    assert store.yield_job(created.job_id, "r1") == "yielded"
    status = store.status(created.job_id)
    assert status is not None
    assert (status.state, status.restarts) == ("queued", 0)
    assert store.pop_queued(1) == created.job_id


def test_delete_forgets_the_key_the_owner_and_the_queue_entry(store: JobStore) -> None:
    created = store.start(start_request())

    store.delete(created.job_id)

    assert store.status(created.job_id) is None
    assert store.find_by_key(start_request().idempotency_key) is None
    assert store.jobs_of_owner(start_request().owner.org_id) == []
    assert store.pop_queued(1) is None
    assert store.start(start_request()).status == "created"


def test_touching_a_released_job_does_not_resurrect_it(store: JobStore) -> None:
    created = store.start(start_request())
    store.delete(created.job_id)

    store.touch_polled(created.job_id)

    assert store.status(created.job_id) is None
    assert store.redis.exists(f"extraction:job:{created.job_id}") == 0
