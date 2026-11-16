#!/usr/bin/env python3
"""Actual concurrent-process checks for scheduling only, never service acceptance."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile

script = str(Path(__file__).with_name("fleet-ledger.py").resolve())
with tempfile.TemporaryDirectory(prefix="asa-fleet-claim-", dir="/tmp") as directory:
    ledger = Path(directory) / "ledger.json"
    base = [sys.executable, script]
    init = subprocess.run(base + ["init", "--ledger", str(ledger)], capture_output=True, text=True)
    assert init.returncode == 0, init.stderr
    attempts = [subprocess.Popen(
        base + ["claim", "--ledger", str(ledger), "--ticket", "RAG-001", "--worker", f"claim-probe-{i}"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    ) for i in range(2)]
    for process in attempts:
        process.communicate(timeout=20)
    codes = [p.returncode for p in attempts]
    assert sorted(codes) == [0, 1], codes
    state = json.loads(ledger.read_text())
    assert state["tickets"]["RAG-001"]["status"] == "RUNNING"
    assert len(state["events"]) == 1
    dependent = subprocess.run(base + ["claim", "--ledger", str(ledger), "--ticket", "RAG-002", "--worker", "must-not-run"], capture_output=True, text=True)
    assert dependent.returncode == 1
    reset = subprocess.run(base + ["init", "--ledger", str(ledger)], capture_output=True, text=True)
    assert reset.returncode == 1
    restart = subprocess.run(base + ["reconcile", "--ledger", str(ledger)], capture_output=True, text=True)
    assert restart.returncode == 0
    assert json.loads(ledger.read_text())["tickets"]["RAG-001"]["status"] == "RUNNING"
    print(json.dumps({"kind": "orchestration-only-process-probe", "assertions": 8, "passed": 8, "failed": 0,
                      "concurrent_claim_exit_codes": codes, "dependent_claim_exit_code": dependent.returncode,
                      "reset_exit_code": reset.returncode, "restart_exit_code": restart.returncode,
                      "enterprise_acceptance": False}))
