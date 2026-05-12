from fastapi import FastAPI
from auth import router as auth_router
from database import Base, engine
from fastapi.middleware.cors import CORSMiddleware
from location import router as location_router
from pickup import router as pickup_router
from worker import router as worker_router
from admin import router as admin_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BinGo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(location_router, tags=["Location"])
app.include_router(pickup_router)
app.include_router(worker_router)
app.include_router(admin_router)