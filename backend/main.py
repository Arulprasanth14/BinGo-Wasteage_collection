from fastapi import FastAPI
from auth import router as auth_router # Import your auth router
from database import Base, engine
from fastapi.middleware.cors import CORSMiddleware
from location import router as location_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ADD THIS LINE:
app.include_router(auth_router) 
app.include_router(location_router, tags=["Location"])