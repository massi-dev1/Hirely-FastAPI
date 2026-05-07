import time

from jose import jwt

from models import User
from routers.auth import ALGORITHM, SECRET_KEY, get_password_hash


def test_signup_seeker_creates_pending_user(client, db_session, fake_email_sender):
    response = client.post(
        "/auth/signup/seeker",
        json={
            "username": "seeker_user",
            "email": "seeker@example.com",
            "password": "secret123",
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "message": "Account created! Check your email to verify your account."
    }
    assert fake_email_sender["sent_emails"] == ["seeker@example.com"]

    user = db_session.query(User).filter(User.email == "seeker@example.com").first()
    assert user is not None
    assert user.username == "seeker_user"
    assert user.role == "seeker"
    assert user.company_name is None
    assert user.is_active is True
    assert user.is_verified is False
    assert user.hashed_password != "secret123"


def test_signup_company_creates_pending_company_user(client, db_session, fake_email_sender):
    response = client.post(
        "/auth/signup/company",
        json={
            "username": "company_user",
            "company_name": "  Acme Corp  ",
            "email": "company@example.com",
            "password": "secret123",
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "message": "Account created! Check your email to verify your account."
    }
    assert fake_email_sender["sent_emails"] == ["company@example.com"]

    user = db_session.query(User).filter(User.email == "company@example.com").first()
    assert user is not None
    assert user.username == "company_user"
    assert user.role == "company"
    assert user.company_name == "Acme Corp"
    assert user.is_verified is False


def test_login_returns_bearer_token_for_verified_user(client, db_session):
    user = User(
        username="verified_user",
        email="verified@example.com",
        hashed_password=get_password_hash("secret123"),
        role="seeker",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    response = client.post(
        "/auth/token",
        data={"username": "verified_user", "password": "secret123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    payload = jwt.decode(body["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "verified_user"
    assert payload["id"] == user.id
    assert payload["role"] == "seeker"


def test_login_rejects_wrong_credentials(client, db_session):
    user = User(
        username="verified_user",
        email="verified@example.com",
        hashed_password=get_password_hash("secret123"),
        role="seeker",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/auth/token",
        data={"username": "verified_user", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"


def test_verify_email_accepts_correct_code(client, db_session, fake_email_sender):
    signup_response = client.post(
        "/auth/signup/seeker",
        json={
            "username": "verify_me",
            "email": "verify@example.com",
            "password": "secret123",
        },
    )
    assert signup_response.status_code == 201

    response = client.post(
        "/auth/verify-email",
        json={
            "email": "verify@example.com",
            "code": fake_email_sender["code"],
        },
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Email verified successfully"}

    user = db_session.query(User).filter(User.email == "verify@example.com").first()
    assert user.is_verified is True


def test_verify_email_rejects_wrong_code(client, db_session, fake_email_sender):
    signup_response = client.post(
        "/auth/signup/seeker",
        json={
            "username": "wrong_code_user",
            "email": "wrong-code@example.com",
            "password": "secret123",
        },
    )
    assert signup_response.status_code == 201

    response = client.post(
        "/auth/verify-email",
        json={
            "email": "wrong-code@example.com",
            "code": "999999",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired code"

    user = db_session.query(User).filter(User.email == "wrong-code@example.com").first()
    assert user.is_verified is False


def test_verify_email_rejects_expired_code(client, db_session, fake_email_sender):
    signup_response = client.post(
        "/auth/signup/seeker",
        json={
            "username": "expired_code_user",
            "email": "expired@example.com",
            "password": "secret123",
        },
    )
    assert signup_response.status_code == 201

    from email_config import verification_codes

    verification_codes["expired@example.com"]["expires_at"] = time.time() - 1

    response = client.post(
        "/auth/verify-email",
        json={
            "email": "expired@example.com",
            "code": fake_email_sender["code"],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired code"
    assert "expired@example.com" not in verification_codes

    user = db_session.query(User).filter(User.email == "expired@example.com").first()
    assert user.is_verified is False
