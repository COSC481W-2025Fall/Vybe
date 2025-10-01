import pytest
from app.services.code_service import generate_code, DEFAULT_ALPHABET


def test_generate_code_default():
    """Test code generation with default parameters."""
    code = generate_code()
    assert isinstance(code, str)
    assert len(code) == 4
    assert all(char in DEFAULT_ALPHABET for char in code)


def test_generate_code_custom_length():
    """Test code generation with custom length."""
    code = generate_code(length=6)
    assert len(code) == 6
    assert all(char in DEFAULT_ALPHABET for char in code)


def test_generate_code_custom_alphabet():
    """Test code generation with custom alphabet."""
    custom_alphabet = "ABC123"
    code = generate_code(length=3, alphabet=custom_alphabet)
    assert len(code) == 3
    assert all(char in custom_alphabet for char in code)


def test_generate_code_randomness():
    """Test that generated codes are random."""
    codes = [generate_code() for _ in range(10)]
    # Should have some variation
    assert len(set(codes)) > 1