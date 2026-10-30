from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.departments import router as departments_router
from app.routes.health import router as health_router
from app.routes.linux import router as linux_router
from app.routes.copilot import router as copilot_router
from app.routes.azure import router as azure_router
from app.routes.azure_admin import router as azure_admin_router
from app.routes.azure_visual import router as azure_visual_router
from app.routes.aws import router as aws_router

app = FastAPI(
    title="Fieldnotes API",
    description="Department metadata for the technical interview preparation platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://fieldnoteskp.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(departments_router, prefix="/api")
app.include_router(linux_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(azure_router, prefix="/api")
app.include_router(azure_admin_router, prefix="/api")
app.include_router(azure_visual_router, prefix="/api")
app.include_router(aws_router, prefix="/api")
