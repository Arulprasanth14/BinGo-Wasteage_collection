from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal
from models import Pickup
from pydantic import BaseModel
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
    latitude: float | None = None
    longitude: float | None = None


SECRET_KEY = os.getenv("JWT_SECRET", "bingo_secret")
ALGORITHM = "HS256"


def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.split(" ")[1]  # Bearer <token>
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Helper: build pickup response dict with worker ───────────────────────────
def build_pickup_response(pickup: Pickup, db: Session) -> dict:
    assignment = db.execute(
        text("""
            SELECT u.user_id AS worker_id, u.name
            FROM assignments a
            JOIN users u ON a.worker_user_id = u.user_id
            WHERE a.pickup_id = :pickup_id
            LIMIT 1
        """),
        {"pickup_id": pickup.pickup_id}
    ).fetchone()

    worker = None
    if assignment:
        worker = {
            "worker_id": assignment.worker_id,
            "name": assignment.name,
            "phone": None,
        }

    return {
        "pickup_id": pickup.pickup_id,
        "waste_type": pickup.waste_type,
        "location_text": pickup.location_text,
        "latitude": float(pickup.latitude) if pickup.latitude is not None else None,
        "longitude": float(pickup.longitude) if pickup.longitude is not None else None,
        "status": pickup.status,
        "created_at": pickup.created_at.strftime("%d %b %Y") if pickup.created_at else "",
        "worker": worker,
    }


# ── Create Pickup ─────────────────────────────────────────────────────────────
@router.post("/create")
def create_pickup(
    data: PickupRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    new_pickup = Pickup(
        user_id=user_id,
        waste_type=data.waste_type,
        location_text=data.location_text,
        latitude=data.latitude,
        longitude=data.longitude,
    )
    db.add(new_pickup)
    db.commit()
    db.refresh(new_pickup)
    return {"message": "Pickup created successfully", "pickup_id": new_pickup.pickup_id}


# ── Get Latest Active Pickup ──────────────────────────────────────────────────
@router.get("/active")
def get_active_pickup(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    active = (
        db.query(Pickup)
        .filter(
            Pickup.user_id == user_id,
            Pickup.status.in_(["PENDING", "ASSIGNED", "IN_PROGRESS"])
        )
        .order_by(Pickup.created_at.desc())
        .first()
    )
    if active:
        return {"pickup": build_pickup_response(active, db)}
    return {"pickup": None}


# ── Get Pickup History ────────────────────────────────────────────────────────
@router.get("/history")
def get_pickup_history(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    pickups = (
        db.query(Pickup)
        .filter(Pickup.user_id == user_id)
        .order_by(Pickup.created_at.desc())
        .all()
    )
    return [
        {
            "pickup_id": p.pickup_id,
            "waste_type": p.waste_type,
            "location_text": p.location_text,
            "status": p.status,
            "created_at": p.created_at.strftime("%d %b %Y") if p.created_at else "",
        }
        for p in pickups
    ]


# ── Submit Feedback ───────────────────────────────────────────────────────────
class FeedbackRequest(BaseModel):
    rating: int   # 1–5
    comment: str = ""


@router.post("/{pickup_id}/feedback")
def submit_feedback(
    pickup_id: int,
    data: FeedbackRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    pickup = db.query(Pickup).filter(
        Pickup.pickup_id == pickup_id,
        Pickup.user_id == user_id
    ).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")

    existing = db.execute(
        text("SELECT feedback_id FROM feedback WHERE pickup_id = :pid AND user_id = :uid"),
        {"pid": pickup_id, "uid": user_id}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Feedback already submitted")

    db.execute(
        text("""
            INSERT INTO feedback (pickup_id, user_id, rating, comment)
            VALUES (:pid, :uid, :rating, :comment)
        """),
        {"pid": pickup_id, "uid": user_id, "rating": data.rating, "comment": data.comment},
    )
    db.commit()
    return {"message": "Feedback submitted successfully"}


# ── Get Feedback Status ───────────────────────────────────────────────────────
@router.get("/{pickup_id}/feedback")
def get_feedback(
    pickup_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    row = db.execute(
        text("SELECT rating, comment FROM feedback WHERE pickup_id = :pid AND user_id = :uid"),
        {"pid": pickup_id, "uid": user_id}
    ).fetchone()
    if not row:
        return {"submitted": False, "rating": None, "comment": None}
    return {"submitted": True, "rating": row.rating, "comment": row.comment}


# ── Get Worker Live Location (for user) ───────────────────────────────────────
@router.get("/{pickup_id}/worker-location")
def get_worker_location(
    pickup_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    pickup = db.query(Pickup).filter(
        Pickup.pickup_id == pickup_id,
        Pickup.user_id == user_id
    ).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")

    row = db.execute(
        text("""
            SELECT latitude, longitude, updated_at
            FROM worker_locations
            WHERE pickup_id = :pid
            ORDER BY updated_at DESC
            LIMIT 1
        """),
        {"pid": pickup_id}
    ).fetchone()

    if not row:
        return {"available": False, "latitude": None, "longitude": None}
    return {
        "available": True,
        "latitude": row.latitude,
        "longitude": row.longitude,
        "updated_at": str(row.updated_at),
    }


# ── Get Single Pickup Detail ──────────────────────────────────────────────────
# ⚠️ Keep LAST — otherwise named routes above would be caught by this
@router.get("/{pickup_id}")
def get_pickup_detail(
    pickup_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    pickup = db.query(Pickup).filter(
        Pickup.pickup_id == pickup_id,
        Pickup.user_id == user_id
    ).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    return build_pickup_response(pickup, db)