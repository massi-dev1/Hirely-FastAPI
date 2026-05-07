# Hirely — Job Board Platform

> Connecting talent with opportunity across every industry.

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?style=flat-square&logo=fastapi)
![SQLite](https://img.shields.io/badge/SQLite-Database-lightblue?style=flat-square&logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)

---

##  About

**Hirely** is a full-stack job board web application built with FastAPI. It allows job seekers to browse and apply for jobs, and companies to post job listings and manage applications — all through a clean, modern dark-themed interface.

---

##  Features

### For Job Seekers
- Create an account with **real email verification**
- Browse available job listings with filters
- Apply to jobs and track application status
- Personal dashboard with application statistics

### For Companies
- Post and manage job listings
- Review and update application statuses
- Company dashboard with hiring overview

### For Admins
- Full admin panel to manage users and jobs
- Activate/deactivate accounts

### General
- JWT-based authentication
- Email verification via Gmail SMTP
- Role-based access control (Seeker / Company / Admin)
- Database migrations with Alembic
- Fully responsive dark UI

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | SQLite + SQLAlchemy |
| Migrations | Alembic |
| Auth | JWT (OAuth2) |
| Email | Gmail SMTP (smtplib) |
| Frontend | HTML + CSS + Vanilla JS |
| Icons | Lucide Icons |
| Font | Inter (Google Fonts) |
| Testing | Pytest |

---

##   Getting Started

### Prerequisites
- Python 3.11+
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/massi-dev1/hirely.git
cd hirely

# 2. Create a virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create your .env file
cp .env.example .env
# Then fill in your credentials (see Environment Variables section)

# 5. Run database migrations
alembic upgrade head

# 6. Start the server
uvicorn main:app --reload
```

Open your browser at `http://127.0.0.1:8000`

---

##  Environment Variables

Create a `.env` file in the project root with the following:

```env
# Email (Gmail SMTP)
EMAIL_ADDRESS=your_gmail@gmail.com
EMAIL_PASSWORD=your_16_char_app_password

# JWT
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256

# Admin
ADMIN_PASSWORD=your_admin_password
```

> ⚠️ Never commit your `.env` file. It is already in `.gitignore`.

To generate a secure `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 📁 Project Structure

```
hirely/
├── routers/
│   ├── auth.py          # Signup, login, email verification
│   ├── jobs.py          # Job CRUD operations
│   ├── application.py   # Job applications
│   ├── user.py          # User profile
│   ├── admin.py         # Admin panel
│   └── pages.py         # Page routes
├── static/
│   ├── css/             # Stylesheets
│   └── js/              # Frontend JavaScript
├── templates/           # Jinja2 HTML templates
├── tests/               # Pytest test suite
├── alembic/             # Database migrations
├── database.py          # Database setup
├── models.py            # SQLAlchemy models
├── email_config.py      # Email verification
├── main.py              # App entry point
└── requirements.txt
```

---

##   Running Tests

```bash
pytest tests/
```

---

##  Author

**Massinissa Slimani**
- GitHub: [@massi-dev1](https://github.com/massi-dev1)
- Email: [massinissaslimani33@gmail.com](mailto:massinissaslimani33@gmail.com)

---

## 📬 Contact

For questions or support regarding the app:
📧 [jobboard200@gmail.com](mailto:jobboard200@gmail.com)

---

## 📄 License

This project is licensed under the MIT License.
