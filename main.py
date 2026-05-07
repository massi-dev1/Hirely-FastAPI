from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from routers import auth, jobs, application, admin, user, pages
import os
app = FastAPI(title="Job Board API")

Base.metadata.create_all(bind=engine)



app.mount("/static", StaticFiles(directory="static"), name="static")


app.include_router(auth.router)
app.include_router(user.router)
app.include_router(jobs.router)
app.include_router(application.router)
app.include_router(admin.router)


app.include_router(pages.router)



from database import SessionLocal
from models import User
from routers.auth import get_password_hash

def create_first_admin():
    db = SessionLocal()
    existing = db.query(User).filter(User.username == "admin").first()
    if not existing:
        admin_user = User(
            username="admin",
            email="jobboard200@gmail.com",
            hashed_password=get_password_hash(os.getenv("ADMIN_PASSWORD")),
            role="admin",
            is_active=True,
            is_verified=True,
        )
        db.add(admin_user)
        db.commit()
        print("Admin created")
    else:
        existing.is_verified = True
        db.commit()
    db.close()

create_first_admin()


