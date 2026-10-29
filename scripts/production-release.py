#!/usr/bin/env python3
"""Report verified production deployments, using Core's Slack and Linear secrets."""

import base64
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request


INFRA = "repos/ayunis-core/ayunis-infra"
CORE = "repos/ayunis-core/ayunis-core"
WORKFLOW = ".github/workflows/deploy-hetzner-05-ayunis-core.yml"
REPORTED = "Release reporting complete"
ENVIRONMENT = "production-release-reporting"


def github_api(path, data=None):
    token = os.environ["INFRA_READ_TOKEN" if path.startswith(INFRA + "/") else "GH_TOKEN"]
    request = urllib.request.Request(
        "https://api.github.com/" + path,
        data=None if data is None else json.dumps(data).encode(),
        headers={"Authorization": "Bearer " + token,
                 "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json",
                 "X-GitHub-Api-Version": "2022-11-28"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def resolve_deployment(event, api=github_api):
    if event.get("sender", {}).get("login") != "ayunis-ci[bot]":
        raise ValueError("Only the Ayunis CI app may report production deployments")
    payload = event["client_payload"]
    for key in ("run_id", "run_attempt"):
        if type(payload.get(key)) is not int or payload[key] <= 0:
            raise ValueError("Deployment run identifiers must be positive integers")
    if (payload.get("workflow") != WORKFLOW or payload.get("head_branch") != "main"
            or payload.get("status") not in ("success", "failure", "cancelled", "timed_out")
            or not re.fullmatch(r"[0-9a-f]{40}", payload.get("head_sha", ""))):
        raise ValueError("Expected a completed production deployment on main")
    compose = api(f"{INFRA}/contents/servers/hetzner-05/ayunis-core/docker-compose.yml"
                  f"?ref={payload['head_sha']}")
    text = base64.b64decode(compose["content"]).decode()
    versions = re.findall(
        r"^\s+image: ghcr\.io/ayunis-core/ayunis-core-app:(v\d+\.\d+\.\d+)\s*$",
        text, re.MULTILINE,
    )
    if len(versions) != 1:
        raise ValueError("Expected exactly one versioned production app image")
    version = versions[0]
    result = {"version": version, "status": payload["status"],
              "run_url": f"https://github.com/ayunis-core/ayunis-infra/actions/runs/{payload['run_id']}/attempts/{payload['run_attempt']}",
              "notes": ""}
    if result["status"] == "success":
        details = api(f"{CORE}/releases/tags/{version}")
        if details["draft"] or details["prerelease"] or details["tag_name"] != version:
            raise ValueError("Expected a published stable release for the deployed version")
        result["notes"] = details["body"] or "No changelog entries."
    return result


def already_reported(version, api=github_api):
    query = urllib.parse.urlencode({"ref": version, "environment": ENVIRONMENT,
                                   "per_page": 100})
    for deployment in api(f"{CORE}/deployments?{query}"):
        statuses = api(f"{CORE}/deployments/{deployment['id']}/statuses?per_page=100")
        if any(s["state"] == "success" and s["description"] == REPORTED for s in statuses):
            return True
    return False


def slack_payload(status, version, run_url, notes):
    if status != "success":
        text = f"Production deployment of Ayunis Core {version} failed ({status})."
        return {"text": text, "blocks": [
            {"type": "section", "text": {"type": "mrkdwn",
             "text": f"{text}\n<{run_url}|View deployment logs>"}},
        ]}
    notes = re.sub(r"^## \[.*\n?", "", notes, flags=re.MULTILINE)
    notes = re.sub(r"^### (.*)$", r"*\1*", notes, flags=re.MULTILINE)
    notes = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<\2|\1>", notes)
    notes = re.sub(r"\*\*([^*]+)\*\*", r"*\1*", notes)
    notes = re.sub(r"^\* ", "• ", notes, flags=re.MULTILINE).strip()
    notes = notes or "No changelog entries."
    if len(notes) > 2900:
        notes = notes[:2900] + "..."
    text = f"🎉 Ayunis Core {version} released"
    return {"text": text, "blocks": [
        {"type": "header", "text": {"type": "plain_text", "text": text}},
        {"type": "section", "text": {"type": "mrkdwn", "text": notes}},
        {"type": "actions", "elements": [
            {"type": "button", "text": {"type": "plain_text", "text": "View Release"},
             "url": f"https://github.com/ayunis-core/ayunis-core/releases/tag/{version}"},
        ]},
    ]}


def prepare():
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    result = resolve_deployment(event)
    reported = result["status"] == "success" and already_reported(result["version"])
    Path(os.environ["REPORT_FILE"]).write_text(json.dumps(result))
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        for key, value in {"version": result["version"], "status": result["status"],
                           "report": str(not reported).lower()}.items():
            output.write(f"{key}={value}\n")


def notify():
    result = json.loads(Path(os.environ["REPORT_FILE"]).read_text())
    webhook = os.environ["SLACK_WEBHOOK_URL"]
    if not webhook.startswith("https://hooks.slack.com/services/"):
        raise ValueError("Expected a configured Slack incoming webhook")
    payload = slack_payload(result["status"], result["version"],
                            result["run_url"], result["notes"])
    request = urllib.request.Request(webhook, data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.read().strip() != b"ok":
            raise ValueError("Slack did not acknowledge the notification")


def complete():
    result = json.loads(Path(os.environ["REPORT_FILE"]).read_text())
    if result["status"] != "success":
        raise ValueError("A failed deploy cannot complete a release")
    deployment = github_api(f"{CORE}/deployments", {
        "ref": result["version"], "environment": ENVIRONMENT,
        "auto_merge": False, "required_contexts": [], "production_environment": False,
        "description": "Track completed Slack and Linear release reporting",
    })
    github_api(f"{CORE}/deployments/{deployment['id']}/statuses", {
        "state": "success", "description": REPORTED,
        "log_url": result["run_url"], "auto_inactive": False,
    })


if __name__ == "__main__":
    {"prepare": prepare, "notify": notify, "complete": complete}[sys.argv[1]]()
