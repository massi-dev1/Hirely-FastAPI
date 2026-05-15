import smtplib
import random
import time
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

verification_codes: dict[str, dict] = {}

def generate_code() -> str:
    return str(random.randint(100000, 999999))

def send_verification_email(to_email: str) -> bool:
    code = generate_code()

    verification_codes[to_email] = {
        "code": code,
        "expires_at": time.time() + 600
    }

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your verification code - Hirely"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 32px; background: #0D1120; color: #E8EAF0; border-radius: 12px;">
        <h2 style="color: #6B5FED;">Hire<span style="color: #ffffff;">ly</span></h2>
        <p>Use the code below to verify your email:</p>
        <h1 style="letter-spacing: 10px; color: #6B5FED;">{code}</h1>
        <p style="color: #4A567A;">This code expires in <strong style="color: #E8EAF0;">10 minutes</strong>.</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.sendmail(EMAIL_ADDRESS, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

def verify_code(email: str, code: str) -> bool:
    record = verification_codes.get(email)

    if not record:
        return False

    if time.time() > record["expires_at"]:
        del verification_codes[email]
        return False

    if record["code"] != code:
        return False

    del verification_codes[email]
    return True