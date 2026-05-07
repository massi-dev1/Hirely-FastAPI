from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import bcrypt
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette import status

from database import SessionLocal
from email_config import send_verification_email, verify_code
from models import User
import os
from dotenv import load_dotenv
load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="/auth/token")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]


class SeekerRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=5)
    password: str = Field(min_length=6)


class CompanyRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    company_name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5)
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class ResendVerificationRequest(BaseModel):
    email: str = Field(min_length=5)


class VerifyEmailRequest(BaseModel):
    email: str = Field(min_length=5)
    code: str = Field(min_length=6, max_length=6)


def verify_password(plain: str, hashed: str):
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def get_password_hash(password: str):
    password_bytes = password.encode("utf-8")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def validate_signup_email(email: str) -> str:
    try:
        return validate_email(email, check_deliverability=False).normalized
    except EmailNotValidError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def cleanup_unverified_account(db: Session, email: str):
    existing_unverified = db.query(User).filter(
        User.email == email,
        User.is_verified.is_(False),
    ).first()
    if existing_unverified:
        db.delete(existing_unverified)
        db.commit()


def ensure_signup_is_available(db: Session, username: str, email: str):
    if db.query(User).filter(User.email == email, User.is_verified.is_(True)).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already taken")


def create_pending_user(
    db: Session,
    *,
    username: str,
    email: str,
    password: str,
    role: str,
    company_name: str | None = None,
):
    user = User(
        username=username,
        email=email,
        company_name=company_name,
        hashed_password=get_password_hash(password),
        role=role,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


async def get_current_user(
    token: Annotated[str, Depends(oauth2_bearer)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        role: str = payload.get("role")

        if username is None or user_id is None:
            raise HTTPException(status_code=401, detail="Could not validate user")

        user = db.query(User).filter(User.id == user_id).first()
        if user is None or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")

        return {"username": username, "user_id": user_id, "role": role}
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Could not validate user") from exc


@router.post("/signup/seeker", status_code=status.HTTP_201_CREATED)
async def signup_seeker(
    db: db_dependency,
    request: SeekerRequest,
):
    email = validate_signup_email(request.email)
    username = request.username.strip()

    cleanup_unverified_account(db, email)
    ensure_signup_is_available(db, username, email)

    user = create_pending_user(
        db,
        username=username,
        email=email,
        password=request.password,
        role="seeker",
    )

    if not send_verification_email(email):
        db.delete(user)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification email. Please check your email address and try again.",
        )

    return {"message": "Account created! Check your email to verify your account."}


@router.post("/signup/company", status_code=status.HTTP_201_CREATED)
async def signup_company(
    db: db_dependency,
    request: CompanyRequest,
):
    email = validate_signup_email(request.email)
    username = request.username.strip()
    company_name = request.company_name.strip()

    cleanup_unverified_account(db, email)
    ensure_signup_is_available(db, username, email)

    user = create_pending_user(
        db,
        username=username,
        email=email,
        password=request.password,
        role="company",
        company_name=company_name,
    )

    if not send_verification_email(email):
        db.delete(user)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification email. Please check your email address and try again.",
        )

    return {"message": "Account created! Check your email to verify your account."}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
@router.post("/send-verification", status_code=status.HTTP_200_OK)
async def resend_verification(
    request: ResendVerificationRequest,
    db: db_dependency,
):
    email = validate_signup_email(request.email)
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise HTTPException(status_code=404, detail="Account not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    if not send_verification_email(email):
        raise HTTPException(status_code=500, detail="Failed to send email")

    return {"message": "Verification email sent to your email"}


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    request: VerifyEmailRequest,
    db: db_dependency,
):
    email = validate_signup_email(request.email)
    code = request.code.strip()
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise HTTPException(status_code=404, detail="Account not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    if not verify_code(email, code):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user.is_verified = True
    db.commit()

    return {"message": "Email verified successfully"}


@router.post("/token", response_model=TokenResponse)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: db_dependency,
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Check your inbox or request a new verification link.",
        )

    token = create_access_token(
        data={"sub": user.username, "id": user.id, "role": user.role},
        expires_delta=timedelta(minutes=20),
    )
    return {"access_token": token, "token_type": "bearer"}
