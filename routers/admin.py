from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status
from database import SessionLocal
from models import Job, User, Application
from .auth import get_current_user

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
admin_dependency = Annotated[dict, Depends(get_current_user)]




class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    company_name: str | None = None
    is_active: bool

    class Config:
        from_attributes = True



def verify_admin(user: dict):
    if user is None or user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )




@router.get("/users", response_model=list[UserResponse], status_code=status.HTTP_200_OK)
async def get_all_users(user: admin_dependency, db: db_dependency):

    verify_admin(user)
    return db.query(User).all()


@router.get("/jobs", status_code=status.HTTP_200_OK)
async def get_all_jobs(user: admin_dependency, db: db_dependency):

    verify_admin(user)
    return db.query(Job).all()


@router.get("/applications", status_code=status.HTTP_200_OK)
async def get_all_applications(user: admin_dependency, db: db_dependency):

    verify_admin(user)
    return db.query(Application).all()


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_job(job_id: int, user: admin_dependency, db: db_dependency):

    verify_admin(user)

    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")


    db.query(Application).filter(Application.job_id == job_id).delete()
    db.delete(job)
    db.commit()


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_application(
    application_id: int, user: admin_dependency, db: db_dependency
):

    verify_admin(user)

    application = (
        db.query(Application).filter(Application.id == application_id).first()
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(application)
    db.commit()


@router.put("/users/{user_id}/deactivate", status_code=status.HTTP_200_OK)
async def deactivate_user(user_id: int, user: admin_dependency, db: db_dependency):

    verify_admin(user)

    target_user = db.query(User).filter(User.id == user_id).first()
    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    target_user.is_active = False
    db.commit()
    return {"message": f"User {target_user.username} deactivated"}


@router.put("/users/{user_id}/activate", status_code=status.HTTP_200_OK)
async def activate_user(user_id: int, user: admin_dependency, db: db_dependency):

    verify_admin(user)

    target_user = db.query(User).filter(User.id == user_id).first()
    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.is_active = True
    db.commit()
    return {"message": f"User {target_user.username} activated"}
