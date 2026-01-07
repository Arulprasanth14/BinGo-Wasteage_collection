from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from database import SessionLocal
from models import User
from schema import RegisterRequest, LoginRequest, AuthResponse
import os

# Try to load .env file if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, skip

SECRET_KEY = os.getenv("JWT_SECRET", "bingo_secret")
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"])
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    print("📥 Register request received:", data)

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_pw = pwd_context.hash(data.password)

    new_user = User(
        name=data.name,
        email=data.email,
        password_hash=hashed_pw,
        role="USER"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    print("✅ User inserted:", new_user.email)

    return {"message": "User registered successfully"}


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {"user_id": user.user_id, "role": user.role},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "token": token,
        "role": user.role
    }
