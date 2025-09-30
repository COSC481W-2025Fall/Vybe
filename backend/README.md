# Backend Testing (pytest)

This directory contains the Python backend test scaffold.

## Setup

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

## Run tests

```bash
pytest -q
```

## Structure
- backend/src: backend source code modules
- backend/tests: test modules
- pyproject.toml: pytest config (addopts, markers, paths)

## Coverage (optional)
Add `--cov=backend/src --cov-report=term-missing` to `pytest` or to `addopts` later.

## Coverage
- HTML report: backend/htmlcov/index.html
- XML report: backend/coverage.xml
- Raw data: .coverage (root)

To open HTML locally: open backend/htmlcov/index.html
