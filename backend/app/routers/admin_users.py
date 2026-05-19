import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models.admin_user import AdminUser
from app.routers.auth import get_current_admin_user, pwd_context
from app.schemas.auth import AdminUserRead, AdminUserCreate, AdminUserUpdate

router = APIRouter(prefix="/admin/users", tags=["admin_users"])


def _to_read(user: AdminUser) -> AdminUserRead:
    return AdminUserRead(
        id=str(user.id),
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )


@router.get("", response_model=List[AdminUserRead])
def list_admin_users(
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    return [_to_read(u) for u in session.exec(select(AdminUser)).all()]


@router.post("", response_model=AdminUserRead, status_code=201)
def create_admin_user(
    data: AdminUserCreate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    if session.exec(select(AdminUser).where(AdminUser.email == data.email)).first():
        raise HTTPException(status_code=409, detail="Email already in use")
    if len(data.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    user = AdminUser(
        email=data.email.strip().lower(),
        hashed_password=pwd_context.hash(data.password),
        is_active=data.is_active,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return _to_read(user)


@router.get("/{user_id}", response_model=AdminUserRead)
def get_admin_user(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    user = session.get(AdminUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_read(user)


@router.put("/{user_id}", response_model=AdminUserRead)
def update_admin_user(
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin_user),
):
    user = session.get(AdminUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.email is not None:
        normalised = data.email.strip().lower()
        conflict = session.exec(
            select(AdminUser).where(AdminUser.email == normalised)
        ).first()
        if conflict and conflict.id != user_id:
            raise HTTPException(status_code=409, detail="Email already in use")
        user.email = normalised

    if data.password is not None:
        if len(data.password) < 8:
            raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
        user.hashed_password = pwd_context.hash(data.password)

    if data.is_active is not None:
        # Prevent the only active admin from deactivating themselves
        if not data.is_active and str(user.id) == str(current_user.id):
            active_count = len(
                session.exec(select(AdminUser).where(AdminUser.is_active == True)).all()
            )
            if active_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot deactivate the only active admin user",
                )
        user.is_active = data.is_active

    session.add(user)
    session.commit()
    session.refresh(user)
    return _to_read(user)


@router.delete("/{user_id}", status_code=204)
def delete_admin_user(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin_user),
):
    user = session.get(AdminUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    session.delete(user)
    session.commit()
