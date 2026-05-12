from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal
from models import Pickup, User
from pydantic import BaseModel
from jose import jwt, JWTError
from passlib.context import CryptContext
import os

router = APIRouter(prefix="/admin", tags=["Admin"])

SECRET_KEY = os.getenv("JWT_SECRET", "bingo_secret")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_admin(authorization: str = Header(...)):
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        role = payload.get("role")
        if not user_id or role != "ADMIN":
            raise HTTPException(status_code=403, detail="Admins only")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Dashboard Stats ────────────────────────────────────────────────────────────
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin),
):
    total_users      = db.execute(text("SELECT COUNT(*) FROM users WHERE role='USER'")).scalar()
    total_workers    = db.execute(text("SELECT COUNT(*) FROM users WHERE role='WORKER'")).scalar()
    pending          = db.execute(text("SELECT COUNT(*) FROM pickups WHERE status='PENDING'")).scalar()
    assigned         = db.execute(text("SELECT COUNT(*) FROM pickups WHERE status='ASSIGNED'")).scalar()
    in_progress      = db.execute(text("SELECT COUNT(*) FROM pickups WHERE status='IN_PROGRESS'")).scalar()
    completed        = db.execute(text("SELECT COUNT(*) FROM pickups WHERE status='COMPLETED'")).scalar()
    return {
        "total_users": total_users,
        "total_workers": total_workers,
        "pending_pickups": pending,
        "assigned_pickups": assigned,
        "in_progress_pickups": in_progress,
        "completed_pickups": completed,
    }


# ── List All Regular Users ─────────────────────────────────────────────────────
@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin),
):
    rows = db.execute(
        text("SELECT user_id, name, email, created_at FROM users WHERE role='USER' ORDER BY created_at DESC")
    ).fetchall()
    return [
        {"user_id": r.user_id, "name": r.name, "email": r.email,
         "created_at": r.created_at.strftime("%d %b %Y") if r.created_at else ""}
        for r in rows
    ]


# ── List All Workers ───────────────────────────────────────────────────────────
@router.get("/workers")
def list_workers(
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin),
):
    rows = db.execute(
        text("SELECT user_id, name, email, created_at FROM users WHERE role='WORKER' ORDER BY name")
    ).fetchall()
    return [
        {"user_id": r.user_id, "name": r.name, "email": r.email,
         "created_at": r.created_at.strftime("%d %b %Y") if r.created_at else ""}
        for r in rows
    ]


# ── Create Worker Account ──────────────────────────────────────────────────────
class CreateWorkerRequest(BaseModel):
    name: str
    email: str
    password: str


@router.post("/create-worker")
def create_worker(
    data: CreateWorkerRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = pwd_context.hash(data.password)
    new_worker = User(name=data.name, email=data.email, password_hash=hashed_pw, role="WORKER")
    db.add(new_worker)
    db.commit()
    db.refresh(new_worker)
    return {"message": "Worker created successfully", "user_id": new_worker.user_id, "name": new_worker.name}


# ── Delete Worker ──────────────────────────────────────────────────────────────
@router.delete("/worker/{user_id}")
def delete_worker(
    user_id: int,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin),
):
    worker = db.execute(
        text("SELECT user_id FROM users WHERE user_id=:uid AND role='WORKER'"), {"uid": user_id}
    ).fetchone()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Step 1: Reset all non-completed pickups assigned to this worker back to PENDING
    db.execute(
        text("""
            UPDATE pickups
            SET status = 'PENDING'
            WHERE pickup_id IN (
                SELECT pickup_id FROM assignments WHERE worker_user_id = :uid
            )
            AND status NOT IN ('COMPLETED')
        """),
        {"uid": user_id},
    )

    # Step 2: Delete all assignment records for this worker
    db.execute(
        text("DELETE FROM assignments WHERE worker_user_id = :uid"),
        {"uid": user_id},
    )

    # Step 3: Delete the worker account
    db.execute(text("DELETE FROM users WHERE user_id=:uid"), {"uid": user_id})
    db.commit()
    return {"message": "Worker removed successfully. Active pickups reset to PENDING."}


# ── List Pending Pickups ───────────────────────────────────────────────────────
@router.get("/pending-pickups")
def list_pending_pickups(
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin),
):
    rows = db.execute(
        text("""
            SELECT p.pickup_id, p.waste_type, p.location_text, p.status,
                   p.created_at, u.name AS user_name
            FROM pickups p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.status = 'PENDING'
            ORDER BY p.created_at ASC
        """)
    ).fetchall()
    return [
        {"pickup_id": r.pickup_id, "waste_type": r.waste_type, "location_text": r.location_text,
         "status": r.status, "created_at": r.created_at.strftime("%d %b %Y") if r.created_at else "",
         "user_name": r.user_name}
        for r in rows
    ]


# ── All Pickups Overview ───────────────────────────────────────────────────────
@router.get("/all-pickups")
def list_all_pickups(
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin),
):
    rows = db.execute(
        text("""
            SELECT p.pickup_id, p.waste_type, p.location_text, p.status,
                   p.created_at, u.name AS user_name, w.name AS worker_name
            FROM pickups p
            JOIN users u ON p.user_id = u.user_id
            LEFT JOIN assignments a ON a.pickup_id = p.pickup_id
            LEFT JOIN users w ON a.worker_user_id = w.user_id
            ORDER BY p.created_at DESC
        """)
    ).fetchall()
    return [
        {"pickup_id": r.pickup_id, "waste_type": r.waste_type, "location_text": r.location_text,
         "status": r.status, "created_at": r.created_at.strftime("%d %b %Y") if r.created_at else "",
         "user_name": r.user_name, "worker_name": r.worker_name}
        for r in rows
    ]


# ── Assign / Reassign Pickup to Worker (works for ANY non-completed status) ────
class AssignRequest(BaseModel):
    worker_user_id: int


@router.post("/pickup/{pickup_id}/assign")
@router.post("/pickup/{pickup_id}/reassign")  # same logic, two URLs
def assign_pickup(
    pickup_id: int,
    data: AssignRequest,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin),
):
    pickup = db.query(Pickup).filter(Pickup.pickup_id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    if pickup.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cannot reassign a completed pickup")

    new_worker = db.execute(
        text("SELECT user_id, name FROM users WHERE user_id=:uid AND role='WORKER'"),
        {"uid": data.worker_user_id}
    ).fetchone()
    if not new_worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Clear old location data so user doesn't see stale coordinates
    try:
        db.execute(
            text("DELETE FROM worker_locations WHERE pickup_id = :pid"),
            {"pid": pickup_id},
        )
    except Exception:
        pass  # table may not exist yet

    # Replace assignment
    db.execute(text("DELETE FROM assignments WHERE pickup_id=:pid"), {"pid": pickup_id})
    db.execute(
        text("INSERT INTO assignments (pickup_id, worker_user_id) VALUES (:pid, :wuid)"),
        {"pid": pickup_id, "wuid": data.worker_user_id},
    )

    # Always reset to ASSIGNED so new worker starts fresh
    pickup.status = "ASSIGNED"
    db.commit()
    is_reassign = pickup.status != "PENDING"  # for message clarity
    return {
        "message": "Pickup assigned successfully",
        "pickup_id": pickup_id,
        "worker_name": new_worker.name,
        "reassigned": True,
    }
