from database import Base
from sqlalchemy import Integer, Column, String, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)
    company_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    jobs = relationship("Job", back_populates="owner")
    applications = relationship("Application", back_populates="applicant")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    location = Column(String)
    company = Column(String)
    salary = Column(Integer, nullable=True)
    job_type = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="jobs")
    applications = relationship("Application", back_populates="job")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    status = Column(
        Enum("pending", "accepted", "rejected", name="status_enum"),
        default="pending",
    )
    cover_letter = Column(String)

    applicant = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")