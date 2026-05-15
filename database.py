import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from databases import Database
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jobboard.db")

# SQLite needs check_same_thread=False; PostgreSQL does not
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

database = Database(SQLALCHEMY_DATABASE_URL)
