from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from routers import auth, jobs, application, admin, user, pages
import os


def create_first_admin():
    """Create the default admin account if it doesn't exist."""
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_password:
        print("⚠️  ADMIN_PASSWORD not set — skipping admin creation")
        return

    from database import SessionLocal
    from models import User
    from routers.auth import get_password_hash

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "admin").first()
        if not existing:
            admin_user = User(
                username="admin",
                email="jobboard200@gmail.com",
                hashed_password=get_password_hash(admin_password),
                role="admin",
                is_active=True,
                is_verified=True,
            )
            db.add(admin_user)
            db.commit()
            print("✅ Admin created")
        else:
            existing.is_verified = True
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    create_first_admin()
    yield
    # Shutdown (nothing to do)


app = FastAPI(title="Job Board API", lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(jobs.router)
app.include_router(application.router)
app.include_router(admin.router)
app.include_router(pages.router)
