import pytest
import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sample import add


def test_add_basic():
    """Test basic addition functionality."""
    assert add(2, 3) == 5
    assert add(1, 1) == 2
    assert add(0, 0) == 0


def test_add_negative_numbers():
    """Test addition with negative numbers."""
    assert add(-1, -1) == -2
    assert add(5, -3) == 2
    assert add(-5, 3) == -2


def test_add_error_handling():
    """Test that add function handles errors gracefully."""
    with pytest.raises(TypeError):
        add("5", 3)
    
    with pytest.raises(TypeError):
        add(5, "3")