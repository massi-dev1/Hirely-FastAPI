from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette import status
from database import SessionLocal
from models import User
from .auth import get_current_user, verify_password, get_password_hash

router = APIRouter(
    prefix="/user",
    tags=["user"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]



class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    company_name: str | None = None
    is_active: bool

    class Config:
        from_attributes = True


class PasswordChangeRequest(BaseModel):
    old_password: str = Field(min_length=6)
    new_password: str = Field(min_length=6)


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_my_profile(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_model = db.query(User).filter(User.id == user["user_id"]).first()
    if user_model is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user_model


@router.put("/me/password", status_code=status.HTTP_200_OK)
async def change_password(
    user: user_dependency,
    db: db_dependency,
    password_request: PasswordChangeRequest,
):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_model = db.query(User).filter(User.id == user["user_id"]).first()
    if user_model is None:
        raise HTTPException(status_code=404, detail="User not found")


    if not verify_password(password_request.old_password, user_model.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")


    if password_request.old_password == password_request.new_password:
        raise HTTPException(
            status_code=400, detail="New password must be different"
        )


    user_model.hashed_password = get_password_hash(password_request.new_password)
    db.commit()
    return {"message": "Password changed successfully"}