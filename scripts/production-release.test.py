import base64
import importlib.util
import unittest
from pathlib import Path
import tempfile
import json
import os
from unittest.mock import patch, MagicMock


SPEC = importlib.util.spec_from_file_location(
    "production_release", Path(__file__).with_name("production-release.py")
)
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


class ProductionReleaseTests(unittest.TestCase):
    def setUp(self):
        self.run = {
            "id": 123, "run_attempt": 2, "head_branch": "main",
            "head_sha": "a" * 40, "status": "completed", "conclusion": "success",
            "path": ".github/workflows/deploy-hetzner-05-ayunis-core.yml",
            "html_url": "https://github.com/ayunis-core/ayunis-infra/actions/runs/123",
        }
        self.compose = "    image: ghcr.io/ayunis-core/ayunis-core-app:v2.62.0\n"
        self.requests = []

    def event(self):
        return {"sender": {"login": "ayunis-ci[bot]"}, "client_payload": {
            "run_id": 123, "run_attempt": self.run["run_attempt"],
            "head_branch": self.run["head_branch"], "head_sha": self.run["head_sha"],
            "workflow": self.run["path"], "status": self.run["conclusion"],
        }}

    def api(self, path):
        self.requests.append(path)
        if "/actions/runs/" in path:
            return self.run
        if "/contents/" in path:
            return {"content": base64.b64encode(self.compose.encode()).decode()}
        if "/releases/tags/" in path:
            return {"draft": False, "prerelease": False, "tag_name": "v2.62.0",
                    "body": "## Changes\n* Fix deployment", "target_commitish": "main"}
        raise AssertionError(path)

    def test_success_uses_actual_deployed_version(self):
        result = release.resolve_deployment(self.event(), self.api)
        self.assertEqual(result["version"], "v2.62.0")
        self.assertEqual(result["status"], "success")
        self.assertIn("ref=" + "a" * 40, self.requests[0])

    def test_failure_does_not_fetch_release_notes(self):
        self.run["conclusion"] = "failure"
        result = release.resolve_deployment(self.event(), self.api)
        self.assertEqual(result["status"], "failure")
        self.assertFalse(any("/releases/" in p for p in self.requests))

    def test_cancelled_deploy_is_not_a_release(self):
        self.run["conclusion"] = "cancelled"
        result = release.resolve_deployment(self.event(), self.api)
        self.assertEqual(result["status"], "cancelled")

    def test_rejects_untrusted_or_incomplete_runs(self):
        for key, value in [("head_branch", "feature"), ("path", "other.yml"),
                           ("conclusion", "in_progress"), ("head_sha", "invalid")]:
            with self.subTest(key=key):
                original = self.run[key]
                self.run[key] = value
                with self.assertRaises(ValueError):
                    release.resolve_deployment(self.event(), self.api)
                self.run[key] = original

    def test_rejects_untrusted_sender_before_request(self):
        event = self.event()
        event["sender"]["login"] = "someone-else"
        with self.assertRaises(ValueError):
            release.resolve_deployment(event, self.api)
        self.assertEqual(self.requests, [])

    def test_rejects_payload_injection_before_request(self):
        with self.assertRaises(ValueError):
            event = self.event()
            event["client_payload"]["run_id"] = "123/../../secrets"
            release.resolve_deployment(event, self.api)
        self.assertEqual(self.requests, [])

    def test_rejects_missing_or_ambiguous_version(self):
        for compose in ["", self.compose * 2, self.compose.replace("v2.62.0", "latest")]:
            with self.subTest(compose=compose):
                self.compose = compose
                with self.assertRaises(ValueError):
                    release.resolve_deployment(self.event(), self.api)

    def test_slack_success_has_notes_and_failure_has_run_link(self):
        success = release.slack_payload("success", "v2.62.0", "run-url", "* Fix it")
        failure = release.slack_payload("failure", "v2.62.0", "run-url", "")
        self.assertIn("released", success["text"])
        self.assertIn("Fix it", str(success))
        self.assertIn("failed", failure["text"])
        self.assertNotIn("released", failure["text"])
        self.assertIn("run-url", str(failure))

    def test_slack_notes_are_bounded(self):
        payload = release.slack_payload("success", "v2.62.0", "run-url", "a" * 10000)
        sections = [b for b in payload["blocks"] if b["type"] == "section"]
        self.assertLessEqual(len(sections[0]["text"]["text"]), 3000)

    def test_reported_release_requires_our_persistent_success_marker(self):
        deployments = [{"id": 1}, {"id": 2}]
        def api(path):
            if "/deployments?" in path:
                return deployments
            return [{"state": "success", "description": "Release reporting complete"}]
        self.assertTrue(release.already_reported("v2.62.0", api))
        self.assertFalse(release.already_reported("v2.62.0", lambda p: []))
        def unfinished(path):
            if "/deployments?" in path:
                return deployments
            return [{"state": "pending", "description": "Release reporting complete"}]
        self.assertFalse(release.already_reported("v2.62.0", unfinished))

    def test_slack_delivery_sends_the_expected_json(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report.json"
            report.write_text(json.dumps({"status": "failure", "version": "v2.62.0",
                                          "run_url": "run-url", "notes": ""}))
            response = MagicMock()
            response.__enter__.return_value.read.return_value = b"ok"
            with patch.dict(os.environ, {"REPORT_FILE": str(report),
                            "SLACK_WEBHOOK_URL": "https://hooks.slack.com/services/test"}), \
                    patch.object(release.urllib.request, "urlopen", return_value=response) as send:
                release.notify()
            request = send.call_args.args[0]
            self.assertEqual(request.get_method(), "POST")
            self.assertIn("failed", json.loads(request.data)["text"])

    def test_slack_error_is_not_treated_as_success(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report.json"
            report.write_text(json.dumps({"status": "success", "version": "v2.62.0",
                                          "run_url": "run-url", "notes": ""}))
            response = MagicMock()
            response.__enter__.return_value.read.return_value = b"invalid_payload"
            with patch.dict(os.environ, {"REPORT_FILE": str(report),
                            "SLACK_WEBHOOK_URL": "https://hooks.slack.com/services/test"}), \
                    patch.object(release.urllib.request, "urlopen", return_value=response):
                with self.assertRaises(ValueError):
                    release.notify()

    def test_failed_deploy_cannot_write_a_completion_marker(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report.json"
            report.write_text(json.dumps({"status": "failure"}))
            with patch.dict(os.environ, {"REPORT_FILE": str(report)}), \
                    patch.object(release, "github_api") as api:
                with self.assertRaises(ValueError):
                    release.complete()
                api.assert_not_called()

    def test_build_workflow_cannot_announce_or_complete_a_release(self):
        root = Path(__file__).resolve().parent.parent
        workflow = (root / ".github/workflows/release-please.yml").read_text()
        self.assertNotIn("SLACK_WEBHOOK_URL", workflow)
        self.assertNotIn("linear/linear-release-action", workflow)


if __name__ == "__main__":
    unittest.main()
