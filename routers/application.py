from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette import status
from models import Application, Job
from database import SessionLocal
from .auth import get_current_user

router = APIRouter(
    prefix="/applications",
    tags=["applications"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]




class ApplicationCreateRequest(BaseModel):
    job_id: int = Field(gt=0)
    cover_letter: str = Field(min_length=10, max_length=500)


class ApplicationStatusUpdate(BaseModel):
    status: Literal["pending", "accepted", "rejected"]


class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    user_id: int
    status: str
    cover_letter: str

    class Config:
        from_attributes = True




@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply_for_a_job(
    db: db_dependency,
    user: user_dependency,
    application: ApplicationCreateRequest,
):

    if user is None or user.get("role") != "seeker":
        raise HTTPException(
            status_code=403, detail="Only seekers can apply for jobs"
        )


    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.is_active:
        raise HTTPException(status_code=400, detail="This job is no longer active")


    existing = (
        db.query(Application)
        .filter(
            Application.user_id == user["user_id"],
            Application.job_id == application.job_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="You already applied to this job"
        )


    new_application = Application(
        user_id=user["user_id"],
        job_id=application.job_id,
        cover_letter=application.cover_letter,
        status="pending",
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)
    return new_application


@router.get(
    "/my-applications",
    response_model=list[ApplicationResponse],
    status_code=status.HTTP_200_OK,
)
async def get_my_applications(user: user_dependency, db: db_dependency):

    if user is None or user.get("role") != "seeker":
        raise HTTPException(
            status_code=403, detail="Only seekers can view their applications"
        )

    applications = (
        db.query(Application)
        .filter(Application.user_id == user["user_id"])
        .all()
    )
    return applications


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def withdraw_application(
    application_id: int, db: db_dependency, user: user_dependency
):

    if user is None or user.get("role") != "seeker":
        raise HTTPException(
            status_code=403, detail="Only seekers can withdraw applications"
        )

    application = (
        db.query(Application).filter(Application.id == application_id).first()
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.user_id != user["user_id"]:
        raise HTTPException(
            status_code=403, detail="You can only withdraw your own applications"
        )

    db.delete(application)
    db.commit()



@router.get(
    "/job/{job_id}",
    response_model=list[ApplicationResponse],
    status_code=status.HTTP_200_OK,
)
async def get_applications_for_my_job(
    job_id: int, user: user_dependency, db: db_dependency
):

    if user is None or user.get("role") != "company":
        raise HTTPException(
            status_code=403, detail="Only companies can view job applications"
        )


    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != user["user_id"]:
        raise HTTPException(
            status_code=403, detail="You can only view applications for your own jobs"
        )

    applications = (
        db.query(Application).filter(Application.job_id == job_id).all()
    )
    return applications


@router.put(
    "/{application_id}/status",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
)
async def update_application_status(
    application_id: int,
    update: ApplicationStatusUpdate,
    db: db_dependency,
    user: user_dependency,
):

    if user is None or user.get("role") != "company":
        raise HTTPException(
            status_code=403, detail="Only companies can update application status"
        )


    application = (
        db.query(Application).filter(Application.id == application_id).first()
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")


    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job is None or job.owner_id != user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only update applications for your own jobs",
        )

    application.status = update.status
    db.commit()
    db.refresh(application)
    return application