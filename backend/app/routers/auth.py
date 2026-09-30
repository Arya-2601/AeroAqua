"""
Authentication Router for AeroAqua API
Handles login with Role (Citizen / Authority) and Region selection.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.auth_service import authenticate_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None
    region: Optional[str] = None


class LoginResponse(BaseModel):
    status: str
    user: dict
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

    # Generate a lightweight session token
    token = f"aeroaqua-token-{user['id']}-{user['role']}"

    return LoginResponse(
        status="ok",
        user=user,
        token=token
    )
