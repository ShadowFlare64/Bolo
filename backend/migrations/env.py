from alembic import context
from sqlalchemy import create_engine
from app.config import settings
from app.database import Base
from app import models  # register mapped tables

target_metadata = Base.metadata

if context.is_offline_mode():
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    supplied = context.config.attributes.get("connection")
    def run(connection):
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    if supplied is not None:
        run(supplied)
    else:
        engine = create_engine(settings.database_url)
        with engine.connect() as connection:
            run(connection)
