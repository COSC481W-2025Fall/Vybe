import pytest
import os
from unittest.mock import patch
from app.config import Settings, settings


def test_default_settings():
    """Test that default settings are correctly set."""
    test_settings = Settings()
    assert test_settings.api_name == "Backend Service"
    assert test_settings.api_version == "1.0.0"
    assert test_settings.code_length == 4
    assert test_settings.code_alphabet == "23456789ABCDEFGHJKLMNPQRSTUVWXYZ!@#$%&*?"


def test_environment_variables():
    """Test that environment variables override defaults."""
    with patch.dict(os.environ, {"APP_API_NAME": "Test API", "APP_CODE_LENGTH": "6"}):
        test_settings = Settings()
        assert test_settings.api_name == "Test API"
        assert test_settings.code_length == 6


def test_global_settings():
    """Test that the global settings instance exists."""
    assert settings is not None
    assert isinstance(settings, Settings)