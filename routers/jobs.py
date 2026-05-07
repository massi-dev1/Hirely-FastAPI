from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette import status

from database import SessionLocal
from models import Job

from .auth import get_current_user

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]


class JobRequest(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=10, max_length=500)
    location: str = Field(min_length=3)
    company: str = Field(min_length=1)
    salary: int | None = Field(default=None, gt=0)
    job_type: str = Field(default="fulltime")


class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    location: str
    company: str
    salary: int | None = None
    job_type: str | None = None
    is_active: bool
    owner_id: int

    class Config:
        from_attributes = True


def create_job_in_db(db: Session, job: JobRequest, owner_id: int):
    db_job = Job(**job.model_dump(), owner_id=owner_id, is_active=True)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job


@router.get("/", response_model=list[JobResponse], status_code=status.HTTP_200_OK)
async def get_all_jobs(db: db_dependency):
    jobs = db.query(Job).filter(Job.is_active == True).all()
    return jobs


@router.get("/search", response_model=list[JobResponse], status_code=status.HTTP_200_OK)
async def search_jobs(
    db: db_dependency,
    location: str | None = Query(None),
    company: str | None = Query(None),
    job_type: str | None = Query(None),
    min_salary: int | None = Query(None),
):
    query = db.query(Job).filter(Job.is_active == True)

    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if company:
        query = query.filter(Job.company.ilike(f"%{company}%"))
    if job_type:
        query = query.filter(Job.job_type == job_type)
    if min_salary is not None:
        query = query.filter(Job.salary >= min_salary)

    return query.all()


@router.get("/my/posts", response_model=list[JobResponse], status_code=status.HTTP_200_OK)
async def get_my_posted_jobs(user: user_dependency, db: db_dependency):
    if user is None or user.get("role") != "company":
        raise HTTPException(status_code=403, detail="Only companies can view their posts")

    jobs = db.query(Job).filter(Job.owner_id == user["user_id"]).all()
    return jobs


@router.get("/{job_id}", response_model=JobResponse, status_code=status.HTTP_200_OK)
async def get_job_by_id(job_id: int, db: db_dependency):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def post_a_job(
    user: user_dependency, db: db_dependency, job_request: JobRequest
):
    if user is None or user.get("role") != "company":
        raise HTTPException(status_code=403, detail="Only companies can post jobs")

    return create_job_in_db(db, job_request, user["user_id"])


@router.put("/{job_id}", response_model=JobResponse, status_code=status.HTTP_200_OK)
async def update_my_job(
    job_id: int, user: user_dependency, db: db_dependency, job_request: JobRequest
):
    if user is None or user.get("role") != "company":
        raise HTTPException(status_code=403, detail="Only companies can update jobs")

    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only update your own jobs")

    job.title = job_request.title
    job.description = job_request.description
    job.location = job_request.location
    job.company = job_request.company
    job.salary = job_request.salary
    job.job_type = job_request.job_type
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_job(job_id: int, user: user_dependency, db: db_dependency):
    if user is None or user.get("role") != "company":
        raise HTTPException(status_code=403, detail="Only companies can delete jobs")

    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own jobs")

    db.delete(job)
    db.commit()
