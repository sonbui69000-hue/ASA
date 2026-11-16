#!/usr/bin/env python3
"""Finite synthetic review evidence and artifact checks; no enterprise test claims.

Run from any directory:
  python3 ragplan/2/review/evidence-check.py
Optional preservation audit against the review-time temporary manifest:
  python3 ragplan/2/review/evidence-check.py --baseline /tmp/asa-hostile-before.json

Reads only source/design documents. Does not read .env, workbook files or local state.
Writes only evidence-results.json beside this file. No dependencies or network.
"""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import unquote


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
REPORTS = [
    "hostile-review.md", "algorithm-critique.md", "security-red-team.md",
    "integration-risks.md", "alternative-architecture.md", "required-changes.md",
    "go-no-go.md",
]
checks = []


def record(identifier, condition, detail, scope="documentation_or_synthetic_model"):
    checks.append({"id": identifier, "status": "passed" if condition else "failed",
                   "scope": scope, "detail": detail})


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def headings(path):
    slugs = set()
    counts = {}
    for line in path.read_text().splitlines():
        if not line.startswith("#"):
            continue
        value = re.sub(r"^#+\s+", "", line).strip().lower().replace("`", "")
        value = re.sub(r"[^\w\- ]", "", value).replace(" ", "-")
        n = counts.get(value, 0)
        counts[value] = n + 1
        slugs.add(value if n == 0 else f"{value}-{n}")
    return slugs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", type=Path)
    args = parser.parse_args()
    texts = {name: (HERE / name).read_text() for name in REPORTS}
    record("DOC01", len(texts) == 7, {"required_reports": len(texts)})
    broken = []
    fences = []
    for name, content in texts.items():
        if len(re.findall(r"^```", content, re.M)) % 2:
            fences.append(name)
        for target in re.findall(r"(?<!!)\[[^\]]*\]\(([^)]+)\)", content):
            if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target):
                continue
            local, _, fragment = target.partition("#")
            path = (HERE / unquote(local)).resolve() if local else HERE / name
            # This checker produces the result file after all checks are assembled.
            if not path.exists() and path != HERE / "evidence-results.json":
                broken.append({"from": name, "target": target, "reason": "missing_file"})
            elif fragment and path.suffix == ".md" and unquote(fragment) not in headings(path):
                broken.append({"from": name, "target": target, "reason": "missing_heading"})
    record("DOC02", not broken, {"broken_local_links": broken})
    record("DOC03", not fences, {"unpaired_code_fences": fences})
    master = texts["hostile-review.md"]
    finding_ids = re.findall(r"^### (HR\d{2})\b", master, re.M)
    record("DOC04", finding_ids == [f"HR{i:02}" for i in range(1, 15)],
           {"unique_ordered_findings": finding_ids})
    missing = []
    for block in re.split(r"^### HR\d{2}.*$", master, flags=re.M)[1:]:
        for field in ["Class / severity", "Affected", "Evidence / root cause",
                      "Failure / impact", "Likelihood / confidence", "Correction / alternatives",
                      "Fix now / later", "Verification"]:
            if field not in block:
                missing.append(field)
    record("DOC05", not missing, {"missing_finding_attributes": missing})
    algorithms = re.findall(r"^\| (AX\d{2})\b", texts["algorithm-critique.md"], re.M)
    attacks = re.findall(r"^\| (ST\d{2})\b", texts["security-red-team.md"], re.M)
    workflows = re.findall(r"^\| (\d+)\. ", texts["integration-risks.md"], re.M)
    record("DOC06", algorithms == [f"AX{i:02}" for i in range(1, 33)],
           {"algorithm_challenges": len(algorithms)})
    record("DOC07", attacks == [f"ST{i:02}" for i in range(1, 22)],
           {"security_test_requirements": len(attacks)})
    record("DOC08", workflows == [str(i) for i in range(1, 16)],
           {"workflow_simulations": len(workflows)})

    # M01: literal common read predicate, not an implementation of future RLS.
    active_release, history_capability, staged_reviewer = False, False, True
    readable = staged_reviewer and (active_release or history_capability)
    record("M01", not readable,
           {"case": "unpublished_review_needs_separate_predicate", "literal_common_read": readable})

    # M02: one source member cannot preserve two-source legal evidence.
    v1 = {"warranty_original", "payment_original"}
    v2 = {"payment_amended"}
    needed = {"warranty_original", "payment_amended"}
    record("M02", not needed.issubset(v1) and not needed.issubset(v2)
           and needed.issubset(v1 | v2),
           {"case": "partial_amendment", "either_single_source_suffices": False,
            "reviewed_source_composition_can_suffice": True})

    # M03: abstract event schedule. Real driver/ASGI scheduling is NOT tested.
    state = {"shared_lock": True, "authorized": True, "api_alive": True,
             "driver_observed_loss": False, "revoke_ack": False}
    trace = ["A_authorizes_and_pauses"]
    state["shared_lock"] = False
    trace.append("A_database_session_terminates_API_remains_alive")
    if not state["shared_lock"]:
        state["authorized"] = False
        state["revoke_ack"] = True
        trace.append("B_revokes_and_acknowledges")
    can_resume_unfenced_send = state["api_alive"] and not state["driver_observed_loss"]
    trace.append("A_resumes_pending_unfenced_handoff")
    record("M03", can_resume_unfenced_send and state["revoke_ack"] and not state["authorized"],
           {"case": "unexcluded_lock_loss_schedule", "trace": trace,
            "actual_transport_exploit_tested": False})

    # M04: toy two-dimensional orthogonal spaces, never actual E5 outputs.
    qa, da, qb, db = [1, 0], [1, 0], [0, 1], [0, 1]
    dot = lambda a, b: sum(x*y for x, y in zip(a, b))
    record("M04", len(da) == len(db) and dot(qa, da) == dot(qb, db) == 1
           and dot(qa, db) == 0,
           {"case": "equal_dimensions_do_not_establish_compatible_space",
            "vectors": "synthetic_2D_counterexample_not_model_inference"})

    source_snapshot = {"auth_epoch": "1", "corpus_epoch": "1", "release_id": "synthetic-release"}
    payload_snapshot = dict(source_snapshot)
    accepted_now = False
    record("M05", source_snapshot == payload_snapshot and not accepted_now,
           {"case": "fact_retraction_needs_semantic_invalidation",
            "assumption": "semantic_change_not_wired_to_existing_snapshot_epochs"})
    nul_text = "Điều\u00001"
    record("M06", unicodedata.normalize("NFC", nul_text) == nul_text and "\u0000" in nul_text,
           {"case": "NFC_does_not_remove_NUL", "code_points": len(nul_text),
            "actual_PostgreSQL_roundtrip_tested": False})
    candidate_count = 3 * (20 + 40 + 40)
    record("M07", candidate_count == 300 and candidate_count > 120,
           {"case": "disjoint_candidate_budget", "maximum_before_cap": candidate_count,
            "global_cap": 120, "missing_allocation_policy_not_an_observed_retrieval_loss": True})
    gold, returned = set(range(20)), set(range(10))
    alternative_bundles = [{i} for i in gold]
    recall = len(gold & returned) / len(gold)
    sufficient = any(b.issubset(returned) for b in alternative_bundles)
    record("M08", recall == 0.5 and sufficient,
           {"case": "interchangeable_evidence_vs_jointly_required", "all_relevant_recall_at_10": recall,
            "any_complete_alternative": sufficient})
    seconds_per_page = 45 * 60 / 200
    raster_gib = 2480 * 3508 * 3 * 200 / 1024**3
    record("M09", seconds_per_page == 13.5 and raster_gib > 2,
           {"case": "long_scan_envelope", "extraction_mean_seconds_per_page_to_fit_45min": seconds_per_page,
            "uncompressed_RGB_A4_rasters_200_pages_GiB": round(raster_gib, 4),
            "assumed_raster_dimensions": [2480, 3508],
            "compressed_PNG_or_OCR_performance_measured": False})
    record("M10", 80000 * 384 * 4 / 1024**2 == 117.1875,
           {"case": "raw_vector_lower_bound", "80000_float32_384D_MiB": 117.1875,
            "excludes": ["row_metadata", "indexes", "WAL", "backup", "model_runtime", "shadow_generation"]})
    raw = "A\u0301😀B"
    nfc = unicodedata.normalize("NFC", raw)
    record("M11", len(raw) == 4 and len(nfc) == 3 and len(nfc.encode("utf-16-le")) // 2 == 4,
           {"case": "existing_unicode_example_credited", "raw_cp": len(raw), "nfc_cp": len(nfc),
            "nfc_UTF16_units": len(nfc.encode("utf-16-le")) // 2})

    contract = ROOT / "ragplan/2/rag-data-contracts.md"
    blocks = [json.loads(b) for b in re.findall(r"```json\s*\n(.*?)\n```", contract.read_text(), re.S)]
    example = next(b for b in blocks if isinstance(b, dict) and b.get("evidence_id"))
    computed = hashlib.sha256(example["text"].encode()).hexdigest()
    record("M12", len(example["text"]) == example["span"]["end"] == 48
           and computed == example["text_sha256"],
           {"case": "existing_synthetic_evidence_example_credited", "fenced_JSON_blocks": len(blocks),
            "code_points": len(example["text"]), "hash_matches": computed == example["text_sha256"]})

    preservation = {"status": "not_executed", "reason": "no_baseline_argument"}
    if args.baseline:
        before = json.loads(args.baseline.read_text())
        changed = [p for p, digest in before.items()
                   if not (ROOT / p).is_file() or sha(ROOT / p) != digest]
        preservation = {"status": "passed" if not changed else "failed",
                        "scope": "review_time_tracked_files_and_preexisting_ragplan2_files",
                        "files_compared": len(before), "changed_or_missing": changed}
        record("PRESERVE01", not changed, preservation, scope="file_integrity")

    source_names = [
        "AGENTS.md", "proposal.md", "package.json", "package-lock.json",
        "ragplan/1/rag-plan-prompt.md", "ragplan/1/01-architecture.md", "ragplan/1/02-technology-decisions.md",
        "ragplan/1/03-processing-pipeline.md", "ragplan/1/04-data-model.md",
        "ragplan/1/05-roadmap.md", "ragplan/1/06-testing-benchmarking.md",
        "ragplan/1/07-risks-decisions.md", "ragplan/1/08-implementation-handoff.md",
        "ragplan/1/schemas/ragplan.schema.json", "ragplan/2/raghostile.md",
        "ragplan/2/rag-plan-prompt-2.md", "ragplan/2/rag-readiness-assessment.md",
        "ragplan/2/rag-architecture-review.md", "ragplan/2/rag-algorithm-decisions.md",
        "ragplan/2/rag-data-contracts.md", "ragplan/2/rag-security-design.md",
        "ragplan/2/rag-evaluation-plan.md", "ragplan/2/rag-failure-analysis.md",
        "ragplan/2/rag-implementation-plan.md", "server/rag/chunks.ts",
        "server/rag/retrieval.ts", "server/rag/embeddings.ts", "server/rag/generation.ts",
        "server/state.ts", "server/assistant.ts", "server/http.ts", "server/workspace-lock.ts",
        "server/auth.ts", "scripts/provision-rag-model.mjs",
        "vite.server.config.ts", "vite.e2e.config.ts",
    ]
    result = {
        "review_date": "2026-11-16", "checker": "synthetic_review_evidence_v1",
        "command": "python3 ragplan/2/review/evidence-check.py" + (
            " --baseline " + str(args.baseline) if args.baseline else ""),
        "scope": "finite_synthetic_models_documentation_and_optional_preservation_only",
        "not_executed_by_checker": ["Vitest", "Playwright", "PostgreSQL", "ASGI", "OCR",
                                    "neural_inference", "security_integration", "load", "restore"],
        "checks": checks, "checks_passed": sum(c["status"] == "passed" for c in checks),
        "checks_failed": sum(c["status"] == "failed" for c in checks),
        "preservation": preservation,
        "input_sha256": {p: sha(ROOT / p) for p in source_names},
        "review_sha256": {p: sha(HERE / p) for p in REPORTS + ["evidence-check.py"]},
    }
    result["exit_code"] = 1 if result["checks_failed"] else 0
    (HERE / "evidence-results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: result[k] for k in ["scope", "checks_passed", "checks_failed", "exit_code"]}))
    for c in checks:
        if c["status"] == "failed":
            print(json.dumps(c, ensure_ascii=False))
    raise SystemExit(result["exit_code"])


if __name__ == "__main__":
    main()
