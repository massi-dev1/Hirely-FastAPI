import time

import email_config


class FakeSMTP:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.login_args = None
        self.sendmail_args = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def login(self, username, password):
        self.login_args = (username, password)

    def sendmail(self, sender, recipient, message):
        self.sendmail_args = (sender, recipient, message)


def test_send_verification_email_stores_code_and_uses_smtp(monkeypatch):
    smtp_instances = []

    def fake_smtp_ssl(host, port):
        instance = FakeSMTP(host, port)
        smtp_instances.append(instance)
        return instance

    monkeypatch.setattr(email_config, "EMAIL_ADDRESS", "sender@example.com")
    monkeypatch.setattr(email_config, "EMAIL_PASSWORD", "password123")
    monkeypatch.setattr(email_config, "generate_code", lambda: "654321")
    monkeypatch.setattr(email_config.smtplib, "SMTP_SSL", fake_smtp_ssl)

    start_time = time.time()
    result = email_config.send_verification_email("recipient@example.com")

    assert result is True
    assert len(smtp_instances) == 1
    smtp = smtp_instances[0]
    assert smtp.host == "smtp.gmail.com"
    assert smtp.port == 465
    assert smtp.login_args == ("sender@example.com", "password123")
    assert smtp.sendmail_args is not None
    assert smtp.sendmail_args[0] == "sender@example.com"
    assert smtp.sendmail_args[1] == "recipient@example.com"
    assert "654321" in smtp.sendmail_args[2]

    record = email_config.verification_codes["recipient@example.com"]
    assert record["code"] == "654321"
    assert start_time + 590 <= record["expires_at"] <= start_time + 610


def test_verify_code_returns_true_and_clears_record():
    email_config.verification_codes["user@example.com"] = {
        "code": "123456",
        "expires_at": time.time() + 600,
    }

    assert email_config.verify_code("user@example.com", "123456") is True
    assert "user@example.com" not in email_config.verification_codes


def test_verify_code_returns_false_for_wrong_code():
    email_config.verification_codes["user@example.com"] = {
        "code": "123456",
        "expires_at": time.time() + 600,
    }

    assert email_config.verify_code("user@example.com", "999999") is False
    assert "user@example.com" in email_config.verification_codes


def test_verify_code_returns_false_for_expired_code():
    email_config.verification_codes["user@example.com"] = {
        "code": "123456",
        "expires_at": time.time() - 1,
    }

    assert email_config.verify_code("user@example.com", "123456") is False
    assert "user@example.com" not in email_config.verification_codes
