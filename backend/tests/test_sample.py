import pytest
from sample import add

@pytest.mark.unit
def test_add_returns_sum():
    assert add(2, 3) == 5
