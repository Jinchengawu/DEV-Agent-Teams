from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.user import UserResponse, UserUpdate, PasswordChange
from src.services.user_service import UserService
from src.services.auth_service import get_current_user
from src.models.user import User

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user),
                    db: AsyncSession = Depends(get_db)):
    user = await UserService.update_user(db, current_user.id, data)
    return user


@router.post("/me/change-password")
async def change_password(data: PasswordChange, current_user: User = Depends(get_current_user),
                          db: AsyncSession = Depends(get_db)):
    success = await UserService.change_password(db, current_user.id, data.old_password, data.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    return {"message": "Password changed successfully"}
