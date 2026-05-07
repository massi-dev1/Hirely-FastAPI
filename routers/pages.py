from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter(
    tags=["pages"],
)

templates = Jinja2Templates(directory="templates")


@router.get("/")
async def home_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@router.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@router.get("/signup")
async def signup_page(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})


@router.get("/dashboard")
async def dashboard_page(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})


@router.get("/browse-jobs")
async def jobs_page(request: Request):
    return templates.TemplateResponse("jobs.html", {"request": request})


@router.get("/job/{job_id}")
async def job_detail_page(request: Request, job_id: int):
    return templates.TemplateResponse(
        "job_detail.html", {"request": request, "job_id": job_id}
    )


@router.get("/post-job")
async def post_job_page(request: Request):
    return templates.TemplateResponse("post_job.html", {"request": request})


@router.get("/my-applications")
async def my_applications_page(request: Request):
    return templates.TemplateResponse("my_applications.html", {"request": request})


@router.get("/my-posts")
async def my_posts_page(request: Request):
    return templates.TemplateResponse("my_posts.html", {"request": request})


@router.get("/job-applications/{job_id}")
async def job_applications_page(request: Request, job_id: int):
    return templates.TemplateResponse(
        "job_applications.html", {"request": request, "job_id": job_id}
    )


@router.get("/profile")
async def profile_page(request: Request):
    return templates.TemplateResponse("profile.html", {"request": request})


@router.get("/admin-panel")
async def admin_page(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request})
@router.get("/email-verified")
async def email_verified_page(request: Request):
    return templates.TemplateResponse("email_verified.html", {"request": request})