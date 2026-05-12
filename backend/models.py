from sqlalchemy import Column, Integer, String, TIMESTAMP, Numeric, Text, Float
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user")
    created_at = Column(TIMESTAMP, server_default=func.now())

class Pickup(Base):
    __tablename__ = "pickups"

    pickup_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    waste_type = Column(String(50), nullable=False)
    location_text = Column(String(255))
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    status = Column(String(20), default="PENDING")
    created_at = Column(TIMESTAMP, server_default=func.now())

class Feedback(Base):
    __tablename__ = "feedback"

    feedback_id = Column(Integer, primary_key=True, index=True)
    pickup_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class WorkerLocation(Base):
    __tablename__ = "worker_locations"

    id = Column(Integer, primary_key=True, index=True)
    pickup_id = Column(Integer, nullable=False)
    worker_user_id = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())