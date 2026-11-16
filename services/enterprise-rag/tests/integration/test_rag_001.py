"""Actual local directories/files/child process, not later SQL/OIDC acceptance."""

from pathlib import Path
import json
import os
import stat
import subprocess
import sys

from enterprise_rag.harness import RunEvidence, child_environment, write_evidence


def test_private_roots_are_disjoint_and_child_does_not_inherit_credentials(synthetic_roots, monkeypatch):
    roots = synthetic_roots
    monkeypatch.setenv("OPENROUTER_API_KEY", "synthetic-secret-canary")
    monkeypatch.setenv("ARBITRARY_UNKNOWN_SECRET", "synthetic-secret-canary")
    monkeypatch.setenv("PYTHONPATH", "/synthetic/host-canary")
    monkeypatch.setenv("HTTP_PROXY", "http://synthetic-proxy.invalid")
    names = ("sql", "storage", "journal", "fixtures", "reports", "home")
    assert len({roots.path(name) for name in names}) == len(names)
    for name in names:
        target = roots.path(name)
        assert target.is_dir()
        assert stat.S_IMODE(target.stat().st_mode) == 0o700
        assert target.stat().st_uid == os.getuid()
    result = subprocess.run(
        [sys.executable, "-I", "-c", "import json,os; print(json.dumps(dict(os.environ)))"],
        cwd=roots.path("home"), env=child_environment(roots), close_fds=True,
        check=True, capture_output=True, text=True, timeout=10,
    )
    observed = json.loads(result.stdout)
    assert "synthetic-secret-canary" not in result.stdout
    assert "OPENROUTER_API_KEY" not in observed
    assert "ARBITRARY_UNKNOWN_SECRET" not in observed
    assert "PYTHONPATH" not in observed
    assert "HTTP_PROXY" not in observed
    assert observed["HOME"] == str(roots.path("home"))
    assert observed["HF_HUB_OFFLINE"] == "1"
    assert observed["UV_OFFLINE"] == "true"


def test_evidence_is_private_content_free_metadata_in_synthetic_reports(synthetic_roots):
    evidence = RunEvidence.parse({
        "ticket": "RAG-001", "run_id": "00000000-0000-4000-8000-000000000002",
        "contract": "2.2.0", "command_id": "rag-001-pytest", "status": "blocked",
        "exit_code": 1, "collected": 0, "executed": 0, "passed": 0, "failed": 0,
        "skipped": 0, "duration_seconds": 0.1, "artifact_sha256": None,
        "reason_code": "PYTEST_UNAVAILABLE",
    })
    destination = write_evidence(synthetic_roots, evidence)
    assert destination.parent == synthetic_roots.path("reports")
    assert stat.S_IMODE(destination.stat().st_mode) == 0o600
    actual = json.loads(destination.read_text())
    assert actual["status"] == "blocked"
    assert actual["executed"] == 0
    assert "source_text" not in actual

