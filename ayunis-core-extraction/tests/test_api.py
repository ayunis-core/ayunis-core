from fastapi.testclient import TestClient

from app.api.models import JobFailure, ResultRef
from app.jobs.store import JobStore
from app.main import create_app
from tests.conftest import ORG_ID, SOURCE_ID, InMemoryObjectStore, make_settings, start_request

BODY = start_request().model_dump(by_alias=True)


def test_health_reports_the_contract_version(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "healthy", "contractVersion": 1}
    assert client.get("/ready").json() == {"status": "ready", "contractVersion": 1}


def test_ready_fails_when_minio_is_unreachable(
    client: TestClient, objects: InMemoryObjectStore
) -> None:
    objects.unavailable = True

    response = client.get("/ready")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "STORAGE_UNAVAILABLE"


def test_start_creates_then_returns_the_existing_job(client: TestClient) -> None:
    created = client.post("/v1/jobs", json=BODY)
    again = client.post("/v1/jobs", json=BODY)

    assert created.status_code == 201
    assert again.status_code == 200
    assert created.json()["jobId"] == again.json()["jobId"]
    assert created.json()["state"] == "queued"
    assert created.json()["progress"] == {
        "pagesTotal": None,
        "pagesDone": 0,
        "pagesOcr": 0,
        "pagesText": 0,
    }
    assert created.json()["result"] is None
    assert created.json()["error"] is None


def test_start_rejects_a_conflicting_body_and_an_oversized_page_cap(client: TestClient) -> None:
    client.post("/v1/jobs", json=BODY)

    conflict = client.post(
        "/v1/jobs", json={**BODY, "fileName": "x", "input": {**BODY["input"], "key": "k"}}
    )
    too_many = client.post("/v1/jobs", json={**BODY, "options": {"maxPages": 5000}})
    invalid = client.post("/v1/jobs", json={**BODY, "idempotencyKey": "has space"})

    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"
    assert too_many.status_code == 400
    assert too_many.json()["error"] == {
        "code": "INVALID_REQUEST",
        "message": "options.maxPages 5000 exceeds the service limit 1000",
        "retryable": False,
        "details": None,
    }
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "INVALID_REQUEST"


def test_status_result_and_by_key(client: TestClient, store: JobStore) -> None:
    job_id = client.post("/v1/jobs", json=BODY).json()["jobId"]

    assert client.get("/v1/jobs/missing").status_code == 404
    assert client.get("/v1/jobs/missing").json()["error"]["code"] == "JOB_NOT_FOUND"
    assert client.get(f"/v1/jobs/{job_id}/result").status_code == 409
    assert client.get(f"/v1/jobs/{job_id}/result").json()["error"]["code"] == "JOB_NOT_FINISHED"
    assert client.get(f"/v1/jobs/by-key/{BODY['idempotencyKey']}").json()["jobId"] == job_id

    store.claim(job_id, "r1")
    result = ResultRef(bucket="ayunis", key="k/result.json", bytes=5, sha256="f" * 64, page_count=2)
    store.succeed(job_id, result, "r1", 60)

    assert client.get(f"/v1/jobs/{job_id}/result").json() == result.model_dump(by_alias=True)
    assert client.get(f"/v1/jobs/{job_id}").json()["result"] == result.model_dump(by_alias=True)


def test_cancel_is_idempotent_and_purges_the_output_prefix(
    client: TestClient, objects: InMemoryObjectStore
) -> None:
    job_id = client.post("/v1/jobs", json=BODY).json()["jobId"]
    objects.put(f"{BODY['output']['keyPrefix']}pages/00000.json", b"{}")

    first = client.post(f"/v1/jobs/{job_id}/cancel")
    second = client.post(f"/v1/jobs/{job_id}/cancel")

    assert (first.status_code, first.json()["state"]) == (202, "cancelled")
    assert (second.status_code, second.json()["state"]) == (200, "cancelled")
    assert objects.objects == {}
    assert client.post("/v1/jobs/missing/cancel").status_code == 404


def test_release_by_id_is_idempotent_and_forgets_the_job(
    client: TestClient, objects: InMemoryObjectStore
) -> None:
    job_id = client.post("/v1/jobs", json=BODY).json()["jobId"]
    objects.put(f"{BODY['output']['keyPrefix']}result.json", b"{}")

    assert client.delete(f"/v1/jobs/{job_id}").status_code == 204
    assert client.delete(f"/v1/jobs/{job_id}").status_code == 204
    assert client.get(f"/v1/jobs/{job_id}").status_code == 404
    assert objects.objects == {}


def test_release_by_owner_counts_released_and_cancelled(
    client: TestClient, store: JobStore
) -> None:
    other_source = "f0000000-0000-0000-0000-000000000002"
    active = client.post("/v1/jobs", json=BODY).json()["jobId"]
    done = client.post(
        "/v1/jobs", json=start_request(other_source).model_dump(by_alias=True)
    ).json()["jobId"]
    store.claim(done, "r1")
    store.fail(done, JobFailure(code="EMPTY_DOCUMENT", message="e", retryable=False), "r1", 60)

    scoped = client.post("/v1/jobs/release", json={"orgId": ORG_ID, "sourceIds": [other_source]})
    whole_org = client.post("/v1/jobs/release", json={"orgId": ORG_ID})

    assert scoped.json() == {"released": 1, "cancelled": 0}
    assert whole_org.json() == {"released": 1, "cancelled": 1}
    assert client.get(f"/v1/jobs/{active}").status_code == 404
    assert client.get(f"/v1/jobs/{done}").status_code == 404
    assert client.post(
        "/v1/jobs/release", json={"orgId": ORG_ID, "sourceIds": [SOURCE_ID]}
    ).json() == {
        "released": 0,
        "cancelled": 0,
    }


def test_bearer_token_is_required_when_configured(
    tmp_path: object, store: JobStore, objects: InMemoryObjectStore
) -> None:
    settings = make_settings(tmp_path, EXTRACTION_SERVICE_TOKEN="secret")  # type: ignore[arg-type]
    from app.jobs.service import JobService

    app = create_app(
        settings, run_workers=False, services=(store, objects, JobService(store, objects, settings))
    )
    with TestClient(app) as client:
        denied = client.post("/v1/jobs", json=BODY)
        wrong = client.post("/v1/jobs", json=BODY, headers={"Authorization": "Bearer nope"})
        allowed = client.post("/v1/jobs", json=BODY, headers={"Authorization": "Bearer secret"})
        health = client.get("/health")

    assert denied.status_code == 401
    assert denied.json()["error"]["code"] == "UNAUTHORIZED"
    assert wrong.status_code == 401
    assert allowed.status_code == 201
    assert health.status_code == 200
