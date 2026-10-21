from pathlib import Path
from unittest.mock import patch
from sqlalchemy.exc import OperationalError
from app.config import Settings, BACKEND_DIR
from app import main


def test_environment_file_is_independent_of_working_directory(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert Path(Settings.model_config["env_file"]) == BACKEND_DIR / ".env"
    assert Path(Settings.model_config["env_file"]).is_absolute()


def test_readiness_reports_database_failure_without_exposing_credentials(client):
    with patch.object(main.engine, "connect", side_effect=OperationalError("", {}, Exception("connection refused"))):
        result = client.get("/ready")
    assert result.status_code == 503
    assert "PostgreSQL" in result.json()["detail"]
    assert "bolo_local" not in result.text
