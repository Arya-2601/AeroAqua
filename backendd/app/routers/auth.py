"""
Authentication Router for AeroAqua API
Handles login, optional citizen registration, user profile, and citizen alert preferences.
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..services.auth_service import (
    authenticate_user, hash_password, get_current_user, AuthenticatedUser
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None
    region: Optional[str] = None


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: Optional[str] = "citizen"
    region: Optional[str] = "Delhi"
    preferred_city: Optional[str] = None
    preferred_zone: Optional[str] = None
    notify_anomalies: Optional[bool] = True
    notify_broadcasts: Optional[bool] = True
    notify_events: Optional[bool] = True
    notify_forecast_changes: Optional[bool] = True


class PreferencesUpdateRequest(BaseModel):
    region: Optional[str] = None
    preferred_city: Optional[str] = None
    preferred_zone: Optional[str] = None
    notify_anomalies: Optional[bool] = None
    notify_broadcasts: Optional[bool] = None
    notify_events: Optional[bool] = None
    notify_forecast_changes: Optional[bool] = None


class LoginResponse(BaseModel):
    status: str
    user: Dict[str, Any]
    token: str


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with role and region."""
    user = authenticate_user(
        db,
        username_or_email=payload.username,
        password=payload.password,
        role=payload.role,
        region=payload.region
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = f"aeroaqua-token-{user['id']}-{user['role']}"

    return LoginResponse(
        status="ok",
        user=user,
        token=token
    )


@router.post("/register", response_model=LoginResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Optional Citizen Registration for personalized environmental intelligence and alerts."""
    clean_username = payload.username.strip().lower()
    clean_email = payload.email.strip().lower()

    existing = db.query(User).filter(
        (User.username.ilike(clean_username)) | (User.email.ilike(clean_email))
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Username or email is already registered.")

    new_user = User(
        username=clean_username,
        email=clean_email,
        hashed_password=hash_password(payload.password),
        role=payload.role or "citizen",
        region=payload.region or "Delhi",
        preferred_city=payload.preferred_city,
        preferred_zone=payload.preferred_zone,
        notify_anomalies=payload.notify_anomalies if payload.notify_anomalies is not None else True,
        notify_broadcasts=payload.notify_broadcasts if payload.notify_broadcasts is not None else True,
        notify_events=payload.notify_events if payload.notify_events is not None else True,
        notify_forecast_changes=payload.notify_forecast_changes if payload.notify_forecast_changes is not None else True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    user_dict = {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "role": new_user.role,
        "region": new_user.region,
        "preferred_city": new_user.preferred_city,
        "preferred_zone": new_user.preferred_zone,
        "notify_anomalies": new_user.notify_anomalies,
        "notify_broadcasts": new_user.notify_broadcasts,
        "notify_events": new_user.notify_events,
        "notify_forecast_changes": new_user.notify_forecast_changes,
    }

    token = f"aeroaqua-token-{new_user.id}-{new_user.role}"

    return LoginResponse(
        status="ok",
        user=user_dict,
        token=token
    )


@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """Retrieve profile and alert preferences for the currently authenticated user."""
    auth_user = get_current_user(authorization=authorization, x_user_role=x_user_role, db=db)
    if not auth_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    user = db.query(User).filter(User.id == auth_user.id).first()
    if not user:
        # Fallback profile for guest/test session
        return {
            "id": auth_user.id,
            "username": auth_user.username,
            "email": f"{auth_user.username}@aeroaqua.org",
            "role": auth_user.role,
            "region": auth_user.region,
            "preferred_city": None,
            "preferred_zone": None,
            "notify_anomalies": True,
            "notify_broadcasts": True,
            "notify_events": True,
            "notify_forecast_changes": True,
        }

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "region": user.region,
        "preferred_city": user.preferred_city,
        "preferred_zone": user.preferred_zone,
        "notify_anomalies": bool(user.notify_anomalies if user.notify_anomalies is not None else True),
        "notify_broadcasts": bool(user.notify_broadcasts if user.notify_broadcasts is not None else True),
        "notify_events": bool(user.notify_events if user.notify_events is not None else True),
        "notify_forecast_changes": bool(user.notify_forecast_changes if user.notify_forecast_changes is not None else True),
    }


@router.put("/preferences")
def update_preferences(
    payload: PreferencesUpdateRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """Update citizen region, city, zone, and alert category preferences."""
    auth_user = get_current_user(authorization=authorization, x_user_role=x_user_role, db=db)
    if not auth_user:
        raise HTTPException(status_code=401, detail="Authentication required to update preferences.")

    user = db.query(User).filter(User.id == auth_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if payload.region is not None:
        user.region = payload.region
    if payload.preferred_city is not None:
        user.preferred_city = payload.preferred_city
    if payload.preferred_zone is not None:
        user.preferred_zone = payload.preferred_zone
    if payload.notify_anomalies is not None:
        user.notify_anomalies = payload.notify_anomalies
    if payload.notify_broadcasts is not None:
        user.notify_broadcasts = payload.notify_broadcasts
    if payload.notify_events is not None:
        user.notify_events = payload.notify_events
    if payload.notify_forecast_changes is not None:
        user.notify_forecast_changes = payload.notify_forecast_changes

    db.commit()

    return {
        "status": "ok",
        "message": "Preferences updated successfully.",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "region": user.region,
            "preferred_city": user.preferred_city,
            "preferred_zone": user.preferred_zone,
            "notify_anomalies": user.notify_anomalies,
            "notify_broadcasts": user.notify_broadcasts,
            "notify_events": user.notify_events,
            "notify_forecast_changes": user.notify_forecast_changes,
        }
    }
