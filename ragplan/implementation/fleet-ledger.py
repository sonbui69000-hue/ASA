#!/usr/bin/env python3
"""Orchestrator-only scheduling metadata; never establishes runtime acceptance.

The lock serializes claims across processes. RUNNING entries survive restarts and
must be reconciled against code, tests and independent review before disposition.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from datetime import datetime, timezone

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
LEDGER = HERE / "execution-ledger.json"


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(plan):
    tickets = {t["id"]: t for t in plan["tickets"]}
    if len(tickets) != len(plan["tickets"]):
        raise ValueError("duplicate ticket IDs")
    visiting, visited = set(), set()

    def visit(tid):
        if tid not in tickets:
            raise ValueError(f"missing dependency {tid}")
        if tid in visiting:
            raise ValueError(f"dependency cycle at {tid}")
        if tid in visited:
            return
        visiting.add(tid)
        for dep in tickets[tid]["deps"]:
            visit(dep)
        visiting.remove(tid)
        visited.add(tid)

    for tid in tickets:
        visit(tid)
    return tickets


def save(path, state):
    state["updated_at"] = now()
    fd, temporary = tempfile.mkstemp(prefix=".fleet-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as output:
            json.dump(state, output, ensure_ascii=False, indent=2)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
        directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["init", "queue", "claim", "block", "reconcile"])
    parser.add_argument("--ledger", type=Path, default=LEDGER)
    parser.add_argument("--ticket")
    parser.add_argument("--worker")
    parser.add_argument("--reason")
    args = parser.parse_args()
    plan = json.loads((HERE / "plan-data.json").read_text())
    catalog = validate(plan)
    # This lock file is retained; unlinking an active lock would allow two owners.
    with args.ledger.with_suffix(".lock").open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.action == "init":
            if args.ledger.exists():
                raise ValueError("ledger exists; reconcile instead of resetting")
            state = {
                "contract": plan["contract"], "created_at": now(),
                "plan_sha256": digest(HERE / "plan-data.json"),
                "spec_sha256": digest(ROOT / "ragplan/FINAL_IMPLEMENTATION_SPEC.md"),
                "base_commit": subprocess.check_output(
                    ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                "reconciliation": "No enterprise package or acceptance evidence at initial discovery; all ticket headers TODO.",
                "status_mapping": {"PENDING": "TODO", "READY": "TODO", "RUNNING": "IN_PROGRESS or REVIEW_READY", "BLOCKED": "BLOCKED", "FAILED": "BLOCKED (failed verification)", "DONE": "DONE after independent acceptance only"},
                "tickets": {}, "events": [],
            }
            for tid, ticket in catalog.items():
                state["tickets"][tid] = {
                    "title": ticket["title"], "scope": ticket["scope"],
                    "dependencies": ticket["deps"],
                    "status": "PENDING" if ticket["deps"] else "READY",
                    "worker": None, "worktree": None, "commits": [],
                    "verified_commit": None,
                    "ticket_sha256": digest(HERE / ticket["file"]),
                    "acceptance_criteria": ticket["steps"] + ticket["cases"],
                    "requirements": ticket["requirements"],
                    "required_command": ticket["commands"],
                    "consumer_gate": ticket["gates"],
                    "verification": [], "blockers": [], "review": None,
                }
        else:
            state = json.loads(args.ledger.read_text())
            if state["plan_sha256"] != digest(HERE / "plan-data.json") or state["spec_sha256"] != digest(ROOT / "ragplan/FINAL_IMPLEMENTATION_SPEC.md"):
                raise ValueError("source changed; reconcile approved scope before scheduling")
            for tid, ticket in catalog.items():
                entry = state["tickets"][tid]
                if entry["ticket_sha256"] != digest(HERE / ticket["file"]):
                    raise ValueError(f"{tid} changed; reconcile before scheduling")
                if entry["status"] in {"PENDING", "READY"}:
                    entry["status"] = "READY" if all(state["tickets"][d]["status"] == "DONE" for d in entry["dependencies"]) else "PENDING"
        if args.action == "claim":
            entry = state["tickets"][args.ticket]
            if entry["status"] != "READY" or not args.worker:
                raise ValueError("claim requires READY ticket and worker; duplicate claim refused")
            entry.update(status="RUNNING", worker=args.worker, worktree=str(ROOT), claimed_at=now())
            state["events"].append({"at": now(), "ticket": args.ticket, "action": "claim", "worker": args.worker})
        if args.action == "block":
            if not args.reason or args.ticket not in state["tickets"]:
                raise ValueError("block requires ticket and evidence-backed reason")
            entry = state["tickets"][args.ticket]
            if entry["status"] == "DONE":
                raise ValueError("accepted ticket needs explicit review/reopening")
            entry["status"] = "BLOCKED"
            entry["blockers"].append(args.reason)
            state["events"].append({"at": now(), "ticket": args.ticket, "action": "block", "reason": args.reason})
        if args.action == "reconcile":
            # Deliberately do not infer DONE, discard claims, or retry blocked work.
            state["events"].append({"at": now(), "action": "reconcile", "note": "RUNNING claims require code/test/reviewer reconciliation; BLOCKED needs resolved prerequisite before retry."})
        save(args.ledger, state)
        print(json.dumps({"ready": [t for t, e in state["tickets"].items() if e["status"] == "READY"], "running": [t for t, e in state["tickets"].items() if e["status"] == "RUNNING"], "blocked": [t for t, e in state["tickets"].items() if e["status"] == "BLOCKED"]}))


if __name__ == "__main__":
    main()
