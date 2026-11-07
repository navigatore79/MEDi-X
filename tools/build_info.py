#!/usr/bin/env python3
"""Record reproducible source, Firebase and output identities without secrets."""
import hashlib
import json
import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
artifacts = [
    "app/build/outputs/apk/debug/app-debug.apk",
    "app/build/outputs/apk/release/app-release-unsigned.apk",
    "app/build/outputs/bundle/release/app-release.aab",
    "app/google-services.json",
]
files = {}
for name in artifacts:
    path = root / name
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    files[name] = {"bytes": path.stat().st_size, "sha256": digest.hexdigest()}
config = json.loads((root / "app/google-services.json").read_text())
assert config["project_info"]["project_id"] == "meditaly-e3c9b", "Unexpected Firebase project"
assert any(c["client_info"]["android_client_info"]["package_name"] == "com.ciromaiello.meditaly" for c in config["client"]), "Unexpected Android package"
print(json.dumps({
    "version_code": 86,
    "version_name": "0.9.0-mediapp.86",
    "application_id": "com.ciromaiello.meditaly",
    "source_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
    "workflow_run": os.environ.get("GITHUB_RUN_ID"),
    "firebase_project": config["project_info"]["project_id"],
    "signing": {"test_apk": "debug; compatibility with installed app is not guaranteed", "release_apk": "unsigned; original signing required", "release_aab": "unsigned; original upload signing required"},
    "files": files,
}, indent=2))
