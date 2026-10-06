import asyncio
import json
import threading
import unittest
from unittest.mock import Mock, patch

import anyio
import httpx

from app import main


class AnalyzeSchedulingTests(unittest.TestCase):
    def test_default_concurrency_splits_the_four_cpu_budget_between_two_analyses(self):
        self.assertEqual(main.MAX_CONCURRENT_ANALYSES, 2)

    def test_third_request_queues_until_one_of_two_analyses_finishes(self):
        started_count = 0
        started_lock = threading.Lock()
        first_started = threading.Event()
        second_started = threading.Event()
        third_started = threading.Event()
        release = threading.Event()

        def fake_analyze(text, entities, enqueued_at):
            nonlocal started_count
            with started_lock:
                started_count += 1
                if started_count == 1:
                    first_started.set()
                if started_count == 2:
                    second_started.set()
                if started_count == 3:
                    third_started.set()
            release.wait(timeout=5)
            return main.AnalysisRun(
                results=[],
                metrics=main.AnalysisMetrics(
                    queue_duration_ms=0,
                    model_load_duration_ms=0,
                    processing_duration_ms=1,
                    cold_start=False,
                ),
            )

        async def exercise_endpoint():
            transport = httpx.ASGITransport(app=main.app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://anonymize.test",
            ) as client:
                requests = [
                    asyncio.create_task(
                        client.post("/analyze", json={"text": f"Nachricht {i}"})
                    )
                    for i in range(3)
                ]
                try:
                    self.assertTrue(await asyncio.to_thread(first_started.wait, 1.0))
                    self.assertTrue(await asyncio.to_thread(second_started.wait, 1.0))
                    self.assertFalse(await asyncio.to_thread(third_started.wait, 0.1))
                finally:
                    release.set()
                    await asyncio.gather(*requests)
                self.assertTrue(third_started.is_set())

        with (
            patch.object(main, "_analyze", side_effect=fake_analyze),
            patch.object(
                main,
                "_analysis_limiter",
                anyio.CapacityLimiter(main.MAX_CONCURRENT_ANALYSES),
            ),
        ):
            asyncio.run(exercise_endpoint())


class AnalyzeMetricsTests(unittest.TestCase):
    def test_response_exposes_queue_processing_and_cold_start_timings(self):
        metrics = main.AnalysisMetrics(
            queue_duration_ms=12.25,
            model_load_duration_ms=0.5,
            processing_duration_ms=345.75,
            cold_start=False,
        )

        async def exercise_endpoint():
            transport = httpx.ASGITransport(app=main.app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://anonymize.test",
            ) as client:
                return await client.post("/analyze", json={"text": "Hallo Anna"})

        with patch.object(
            main,
            "_analyze",
            return_value=main.AnalysisRun(results=[], metrics=metrics),
        ):
            response = asyncio.run(exercise_endpoint())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["server-timing"],
            "queue;dur=12.25, model_load;dur=0.50, processing;dur=345.75",
        )
        self.assertEqual(response.headers["x-anonymize-cold-start"], "false")

    def test_worker_logs_safe_metrics_for_failed_analyses(self):
        service = Mock()
        service.analyze.side_effect = RuntimeError("inference failed")

        with (
            patch.object(main, "get_presidio_service", return_value=service),
            patch.object(main, "is_presidio_service_loaded", return_value=True),
            patch.object(
                main.time,
                "perf_counter",
                side_effect=[10.0, 10.01, 10.02, 10.42],
            ),
            self.assertLogs(
                "uvicorn.error.anonymize.analysis", level="INFO"
            ) as captured,
            self.assertRaisesRegex(RuntimeError, "inference failed"),
        ):
            main._analyze("Anna wohnt in Berlin", None, enqueued_at=9.75)

        payload = json.loads(captured.records[0].getMessage())
        self.assertEqual(payload["event"], "anonymize_analysis")
        self.assertEqual(payload["outcome"], "error")
        self.assertEqual(payload["text_length"], 20)
        self.assertEqual(payload["queue_duration_ms"], 250.0)
        self.assertEqual(payload["processing_duration_ms"], 400.0)
        self.assertNotIn("Anna", captured.records[0].getMessage())


if __name__ == "__main__":
    unittest.main()
