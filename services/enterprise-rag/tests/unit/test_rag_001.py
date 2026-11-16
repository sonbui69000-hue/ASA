"""Behavior assertions written before RAG-001 harness implementation."""

from dataclasses import replace
from hashlib import sha256
from pathlib import Path
import json

import pytest

from enterprise_rag.harness import (
    AssetRequirement,
    HarnessViolation,
    RunEvidence,
    require_assets,
    require_decisions,
    validate_issuer_configuration,
)


SERVICE = Path(__file__).resolve().parents[2]


def test_pending_authority_cannot_become_permanent_integration():
    decisions = json.loads((SERVICE / "profiles/decisions.json").read_text())
    for decision in ("A01", "A02a", "A03", "A09", "A05", "A06"):
        with pytest.raises(HarnessViolation, match="DECISION_PENDING"):
            require_decisions(decisions, [decision])
    require_decisions(decisions, [])  # No new authority is required to author fixtures.


def test_unavailable_model_blocks_only_its_named_consumer():
    require_assets([], {})  # Lexical contract engineering has no model dependency.
    with pytest.raises(HarnessViolation, match="ASSET_UNAVAILABLE"):
        require_assets([AssetRequirement("e5", "unavailable", "0" * 64)], {})


def test_asset_must_have_exact_reviewed_identity_and_offline_integrity(tmp_path):
    asset = tmp_path / "synthetic-asset.bin"
    asset.write_bytes(b"synthetic test asset, not a model")
    digest = sha256(asset.read_bytes()).hexdigest()
    requirement = AssetRequirement("synthetic", "fixture-1", digest)
    record = {
        "revision": "fixture-1",
        "sha256": digest,
        "path": str(asset),
        "license": "SYNTHETIC-TEST-ONLY",
        "approval": {"status": "pending", "owner_role": "supply-chain", "reference": None},
    }
    with pytest.raises(HarnessViolation, match="ASSET_UNAPPROVED"):
        require_assets([requirement], {"synthetic": record})
    record["approval"] = {
        "status": "approved", "owner_role": "synthetic-test-owner", "reference": "synthetic-fixture-approval"
    }
    require_assets([requirement], {"synthetic": record})
    with pytest.raises(HarnessViolation, match="ASSET_IDENTITY_MISMATCH"):
        require_assets([replace(requirement, revision="fixture-2")], {"synthetic": record})
    asset.write_bytes(b"tampered synthetic asset")
    with pytest.raises(HarnessViolation, match="ASSET_INTEGRITY_MISMATCH"):
        require_assets([requirement], {"synthetic": record})


@pytest.mark.parametrize("field,value", [("license", None), ("sha256", None), ("revision", "latest")])
def test_asset_without_a_reviewable_pin_stays_disabled(tmp_path, field, value):
    asset = tmp_path / "synthetic.bin"
    asset.write_bytes(b"synthetic")
    digest = sha256(asset.read_bytes()).hexdigest()
    record = {
        "revision": "fixture-1", "sha256": digest, "path": str(asset), "license": "SYNTHETIC-TEST-ONLY",
        "approval": {"status": "approved", "owner_role": "synthetic", "reference": "synthetic-only"},
    }
    record[field] = value
    with pytest.raises(HarnessViolation):
        require_assets([AssetRequirement("synthetic", "fixture-1", digest)], {"synthetic": record})


def test_issuer_configuration_is_loopback_test_only_and_issuance_disabled():
    configuration = json.loads((SERVICE / "tests/fixtures/synthetic/issuer.json").read_text())
    validate_issuer_configuration(configuration)
    for invalid in (
        {**configuration, "test_only": False},
        {**configuration, "issuer": "https://identity.example.invalid"},
        {**configuration, "issuance_enabled": True},
        {**configuration, "pkce_methods": ["plain"]},
        {**configuration, "algorithms": ["none"]},
    ):
        with pytest.raises(HarnessViolation, match="ISSUER_CONFIGURATION_INVALID"):
            validate_issuer_configuration(invalid)


def test_evidence_rejects_zero_test_passes_and_arbitrary_content():
    base = {
        "ticket": "RAG-001", "run_id": "00000000-0000-4000-8000-000000000001",
        "contract": "2.2.0", "command_id": "rag-001-pytest", "status": "passed",
        "exit_code": 0, "collected": 0, "executed": 0, "passed": 0, "failed": 0,
        "skipped": 0, "duration_seconds": 0.0, "artifact_sha256": "0" * 64,
        "reason_code": None,
    }
    with pytest.raises(HarnessViolation, match="EVIDENCE_INVALID"):
        RunEvidence.parse(base)
    valid = {**base, "collected": 2, "executed": 2, "passed": 2}
    RunEvidence.parse(valid)
    for extra in ("source_text", "filename", "query", "token", "exception"):
        with pytest.raises(HarnessViolation, match="EVIDENCE_INVALID"):
            RunEvidence.parse({**valid, extra: "synthetic canary"})
    with pytest.raises(HarnessViolation):
        RunEvidence.parse({**valid, "duration_seconds": float("nan")})
    with pytest.raises(HarnessViolation):
        RunEvidence.parse({**valid, "executed": True})

