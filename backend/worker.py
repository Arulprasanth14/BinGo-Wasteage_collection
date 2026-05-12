from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal
from models import Pickup
from pydantic import BaseModel
from jose import jwt, JWTError
import os

router = APIRouter(prefix="/worker", tags=["Worker"])

SECRET_KEY = os.getenv("JWT_SECRET", "bingo_secret")
ALGORITHM = "HS256"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_worker(authorization: str = Header(...)):
    """Validates JWT and ensures the caller has WORKER role."""
    try:
        token = authorization.split(" ")[1]  # Bearer <token>
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        role = payload.get("role")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        if role != "WORKER":
            raise HTTPException(status_code=403, detail="Access denied. Workers only.")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Get All Assigned Pickups ───────────────────────────────────────────────────
@router.get("/assigned")
def get_assigned_pickups(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_worker),
):
    """Returns all pickups (active + completed) assigned to this worker."""
    worker_row = db.execute(
        text("SELECT name FROM users WHERE user_id = :uid"),
        {"uid": user_id},
    ).fetchone()
    worker_name = worker_row.name if worker_row else "Worker"

    rows = db.execute(
        text("""
            SELECT p.pickup_id, p.waste_type, p.location_text, p.latitude, p.longitude, p.status, p.created_at
            FROM assignments a
            JOIN pickups p ON a.pickup_id = p.pickup_id
            WHERE a.worker_user_id = :worker_user_id
            ORDER BY a.assigned_at DESC
        """),
        {"worker_user_id": user_id},
    ).fetchall()

    return {
        "worker_name": worker_name,
        "pickups": [
            {
                "pickup_id": row.pickup_id,
                "waste_type": row.waste_type,
                "location_text": row.location_text,
                "latitude": float(row.latitude) if row.latitude is not None else None,
                "longitude": float(row.longitude) if row.longitude is not None else None,
                "status": row.status,
                "created_at": row.created_at.strftime("%d %b %Y") if row.created_at else "",
            }
            for row in rows
        ],
    }


# ── Get Single Pickup Detail (Worker View) ─────────────────────────────────────
@router.get("/pickup/{pickup_id}")
def get_worker_pickup_detail(
    pickup_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_worker),
):
    """Returns details of a specific pickup assigned to this worker."""
    row = db.execute(
        text("""
            SELECT p.pickup_id, p.waste_type, p.location_text, p.latitude, p.longitude, p.status, p.created_at
            FROM assignments a
            JOIN pickups p ON a.pickup_id = p.pickup_id
            WHERE a.pickup_id = :pickup_id AND a.worker_user_id = :worker_user_id
            LIMIT 1
        """),
        {"pickup_id": pickup_id, "worker_user_id": user_id},
    ).fetchone()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Pickup not found or not assigned to you",
        )

    return {
        "pickup_id": row.pickup_id,
        "waste_type": row.waste_type,
        "location_text": row.location_text,
        "latitude": float(row.latitude) if row.latitude is not None else None,
        "longitude": float(row.longitude) if row.longitude is not None else None,
        "status": row.status,
        "created_at": row.created_at.strftime("%d %b %Y") if row.created_at else "",
    }


# ── Update Pickup Status ───────────────────────────────────────────────────────
class StatusUpdate(BaseModel):
    status: str


@router.patch("/pickup/{pickup_id}/status")
def update_pickup_status(
    pickup_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_worker),
):
    """Allows a worker to update the status of their assigned pickup."""
    allowed_statuses = ["IN_PROGRESS", "COMPLETED", "PENDING"]
    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {allowed_statuses}",
        )

    # Verify this assignment belongs to this worker
    assignment = db.execute(
        text("""
            SELECT assignment_id FROM assignments
            WHERE pickup_id = :pid AND worker_user_id = :wuid
        """),
        {"pid": pickup_id, "wuid": user_id},
    ).fetchone()

    if not assignment:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this pickup",
        )

    pickup = db.query(Pickup).filter(Pickup.pickup_id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")

    pickup.status = data.status
    db.commit()
    db.refresh(pickup)

    return {"message": "Status updated successfully", "status": pickup.status}


# ── Post Worker GPS Location ───────────────────────────────────────────────────
class LocationUpdate(BaseModel):
    pickup_id: int
    latitude: float
    longitude: float


@router.post("/location")
def update_worker_location(
    data: LocationUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_worker),
):
    """
    Worker posts their live GPS coordinates during an active pickup.
    Upserts into worker_locations (one row per pickup/worker pair).
    """
    # Verify the worker is assigned to this pickup
    assignment = db.execute(
        text("""
            SELECT assignment_id FROM assignments
            WHERE pickup_id = :pid AND worker_user_id = :wuid
        """),
        {"pid": data.pickup_id, "wuid": user_id},
    ).fetchone()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned to this pickup")

    # Upsert: delete old row then insert fresh (works across all DB engines)
    db.execute(
        text("""
            DELETE FROM worker_locations
            WHERE pickup_id = :pid AND worker_user_id = :wuid
        """),
        {"pid": data.pickup_id, "wuid": user_id},
    )
    db.execute(
        text("""
            INSERT INTO worker_locations (pickup_id, worker_user_id, latitude, longitude, updated_at)
            VALUES (:pid, :wuid, :lat, :lng, CURRENT_TIMESTAMP)
        """),
        {"pid": data.pickup_id, "wuid": user_id, "lat": data.latitude, "lng": data.longitude},
    )
    db.commit()
    return {"message": "Location updated", "latitude": data.latitude, "longitude": data.longitude}
