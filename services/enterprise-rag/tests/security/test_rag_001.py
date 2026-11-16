"""Synthetic configuration negatives; no claim of a hostile parser sandbox."""

from pathlib import Path

import pytest

from enterprise_rag.harness import HarnessViolation, SyntheticRoots, validate_mounts


def test_repository_and_broad_parent_cannot_be_synthetic_roots():
    repository = Path(__file__).resolve().parents[4]
    for forbidden in (repository, repository / ".local", repository.parent, Path("/")):
        with pytest.raises(HarnessViolation, match="ROOT_OUTSIDE_SYNTHETIC_BOUNDARY"):
            SyntheticRoots.create(forbidden, repository)


def test_only_new_synthetic_paths_are_valid_mounts(synthetic_roots):
    roots = synthetic_roots
    fixture = roots.path("fixtures") / "synthetic.txt"
    fixture.write_text("Nội dung tổng hợp chỉ dùng kiểm thử.")
    validate_mounts([fixture], roots)
    for forbidden in (roots.repository, roots.repository / ".local/online", Path("/"), Path("/tmp")):
        with pytest.raises(HarnessViolation, match="MOUNT_OUTSIDE_SYNTHETIC_BOUNDARY"):
            validate_mounts([forbidden], roots)


def test_symlink_mount_cannot_smuggle_host_paths(synthetic_roots):
    roots = synthetic_roots
    host_link = roots.path("fixtures") / "host-link"
    host_link.symlink_to(roots.repository, target_is_directory=True)
    with pytest.raises(HarnessViolation):
        validate_mounts([host_link / "AGENTS.md"], roots)
    fixture = roots.path("fixtures") / "synthetic.txt"
    fixture.write_text("Tổng hợp")
    alias = roots.path("fixtures") / "alias.txt"
    alias.symlink_to(fixture)
    with pytest.raises(HarnessViolation, match="SYMLINK_UNSUPPORTED"):
        validate_mounts([alias], roots)


def test_widened_directory_permissions_fail_revalidation(synthetic_roots):
    roots = synthetic_roots
    roots.path("storage").chmod(0o755)
    with pytest.raises(HarnessViolation, match="PRIVATE_ROOT_INVALID"):
        roots.validate()

