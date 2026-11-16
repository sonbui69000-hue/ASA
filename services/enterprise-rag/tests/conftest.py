"""Only newly created synthetic roots; no existing application state is read."""

from pathlib import Path
import tempfile

import pytest

from enterprise_rag.harness import SyntheticRoots


@pytest.fixture
def synthetic_roots():
    repository = Path(__file__).resolve().parents[3]
    with tempfile.TemporaryDirectory(prefix="enterprise-rag-test-", dir="/tmp") as parent:
        yield SyntheticRoots.create(Path(parent), repository)

