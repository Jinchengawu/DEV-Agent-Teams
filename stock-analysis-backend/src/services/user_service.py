from uuid import UUID
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.user import UserCreate, UserUpdate
from src.services.auth_service import hash_password, verify_password


class UserService:
    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        user = User(
            email=user_data.email,
            username=user_data.username,
            display_name=user_data.display_name,
            hashed_password=hash_password(user_data.password),
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def authenticate(db: AsyncSession, username: str, password: str) -> Optional[User]:
        user = await UserService.get_by_username(db, username)
        if user is None:
            # Also try email login
            user = await UserService.get_by_email(db, username)
        if user is None or not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    async def update_user(db: AsyncSession, user_id: UUID, data: UserUpdate) -> Optional[User]:
        user = await UserService.get_by_id(db, user_id)
        if user is None:
            return None
        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(user, key, value)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def change_password(db: AsyncSession, user_id: UUID, old_pw: str, new_pw: str) -> bool:
        user = await UserService.get_by_id(db, user_id)
        if user is None or not verify_password(old_pw, user.hashed_password):
            return False
        user.hashed_password = hash_password(new_pw)
        await db.flush()
        return True

    @staticmethod
    async def list_users(db: AsyncSession, skip: int = 0, limit: int = 50) -> tuple[list[User], int]:
        count_result = await db.execute(select(func.count()).select_from(User))
        total = count_result.scalar() or 0
        result = await db.execute(select(User).order_by(User.created_at.desc()).offset(skip).limit(limit))
        return list(result.scalars().all()), total
