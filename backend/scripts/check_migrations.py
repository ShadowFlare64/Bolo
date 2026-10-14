"""Verify upgrade/downgrade/upgrade on an EMPTY disposable test database."""
import os
from alembic import command
from alembic.config import Config
from dotenv import dotenv_values
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url

url = os.environ.get("TEST_DATABASE_URL") or dotenv_values(".env").get("TEST_DATABASE_URL")
if not url or make_url(url).get_backend_name() != "postgresql" or not (make_url(url).database or "").endswith("_test"):
    raise SystemExit("Set TEST_DATABASE_URL to a disposable PostgreSQL database ending in _test")
engine = create_engine(url)
with engine.begin() as connection:
    config = Config("alembic.ini")
    config.attributes["connection"] = connection
    command.upgrade(config, "head")
    tables = set(inspect(connection).get_table_names()) - {"alembic_version"}
    if any(connection.scalar(text(f'SELECT count(*) FROM "{table}"')) for table in tables):
        raise SystemExit("Migration round-trip requires an empty test database; no data was deleted")
    command.check(config)
    command.downgrade(config, "base")
    assert set(inspect(connection).get_table_names()) <= {"alembic_version"}
    command.upgrade(config, "head")
    command.check(config)
print("PASS: PostgreSQL migration upgrade/downgrade/upgrade and model alignment")
