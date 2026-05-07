import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from email_config import verification_codes
from routers import auth


@pytest.fixture()
def test_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def testing_session_local(test_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def clear_verification_codes():
    verification_codes.clear()
    yield
    verification_codes.clear()


@pytest.fixture()
def fake_email_sender(monkeypatch):
    sent_emails = []
    fixed_code = "123456"

    def _fake_send_verification_email(to_email: str) -> bool:
        sent_emails.append(to_email)
        verification_codes[to_email] = {
            "code": fixed_code,
            "expires_at": time.time() + 600,
        }
        return True

    monkeypatch.setattr(auth, "send_verification_email", _fake_send_verification_email)
    return {"sent_emails": sent_emails, "code": fixed_code}


@pytest.fixture()
def app(testing_session_local):
    app = FastAPI()
    app.include_router(auth.router)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[auth.get_db] = override_get_db
    return app


@pytest.fixture()
def client(app):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def db_session(testing_session_local):
    db = testing_session_local()
    try:
        yield db
    finally:
        db.close()
