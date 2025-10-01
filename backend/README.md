# Backend Testing

This backend uses FastAPI and includes comprehensive tests for all components.

## Running Tests

### Quick Test
```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest app/tests/test_main.py
```

### Test Structure
- `app/tests/` - Main application tests
- `tests/` - Sample/utility tests
- `conftest.py` - Test configuration and fixtures

### Test Categories
- **Unit Tests** - Individual functions and components
- **Integration Tests** - API endpoints and workflows
- **Service Tests** - Business logic validation

## Test Files
- `test_main.py` - App factory and health checks
- `test_config.py` - Configuration and settings
- `test_code_service.py` - Code generation logic
- `test_utils_service.py` - UUID and slug utilities
- `test_code_router.py` - Code API endpoints
- `test_utils_router.py` - Utils API endpoints
- `test_schemas.py` - Pydantic model validation
- `test_integration.py` - End-to-end workflows

## Requirements
```bash
pip install -r requirements.txt
```

## Coverage
```bash
# Run tests with coverage
pytest --cov=app

# Generate HTML coverage report
pytest --cov=app --cov-report=html
```