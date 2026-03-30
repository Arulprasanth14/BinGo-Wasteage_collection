from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Pickup
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Header
from jose import jwt, JWTError
import os

router = APIRouter(prefix="/pickup", tags=["Pickup"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class PickupRequest(BaseModel):
    waste_type: str
    location_text: str

SECRET_KEY = os.getenv("JWT_SECRET", "bingo_secret")
ALGORITHM = "HS256"

def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.split(" ")[1]   # Bearer <token>

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_id

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/create")
def create_pickup(
    data: PickupRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):

    new_pickup = Pickup(
        user_id=user_id,
        waste_type=data.waste_type,
        location_text=data.location_text
    )

    db.add(new_pickup)
    db.commit()
    db.refresh(new_pickup)

    return {
        "message": "Pickup created successfully",
        "pickup_id": new_pickup.pickup_id
    }