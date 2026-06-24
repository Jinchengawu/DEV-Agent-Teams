"""
Integration tests for UserService and User model.
"""
import pytest

from sqlalchemy.ext.asyncio import AsyncSession
from src.services.user_service import UserService
from src.schemas.user import UserCreate, UserUpdate
from src.models.user import User


@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    """UserService.create_user creates a user with hashed password."""
    user = await UserService.create_user(db_session, UserCreate(
        email="svc_test@example.com",
        username="svc_test",
        password="TestPass123",
        display_name="Service Test",
    ))
    await db_session.commit()
    await db_session.refresh(user)

    assert user.id is not None
    assert user.email == "svc_test@example.com"
    assert user.username == "svc_test"
    assert user.hashed_password != "TestPass123"  # Must be hashed
    assert user.is_active is True
    assert user.subscription_tier == "free"


@pytest.mark.asyncio
async def test_get_by_email(db_session: AsyncSession):
    """get_by_email finds user by email."""
    user = await UserService.create_user(db_session, UserCreate(
        email="findme@example.com", username="findme", password="TestPass123",
    ))
    await db_session.commit()

    found = await UserService.get_by_email(db_session, "findme@example.com")
    assert found is not None
    assert found.id == user.id


@pytest.mark.asyncio
async def test_get_by_email_not_found(db_session: AsyncSession):
    """get_by_email returns None for unknown email."""
    found = await UserService.get_by_email(db_session, "nobody@example.com")
    assert found is None


@pytest.mark.asyncio
async def test_get_by_username(db_session: AsyncSession):
    """get_by_username finds user by username."""
    user = await UserService.create_user(db_session, UserCreate(
        email="uname@example.com", username="unique_name", password="TestPass123",
    ))
    await db_session.commit()

    found = await UserService.get_by_username(db_session, "unique_name")
    assert found is not None
    assert found.id == user.id


@pytest.mark.asyncio
async def test_authenticate_success(db_session: AsyncSession):
    """authenticate returns user with correct credentials."""
    user = await UserService.create_user(db_session, UserCreate(
        email="auth@example.com", username="authuser", password="CorrectPass1",
    ))
    await db_session.commit()

    authed = await UserService.authenticate(db_session, "authuser", "CorrectPass1")
    assert authed is not None
    assert authed.id == user.id


@pytest.mark.asyncio
async def test_authenticate_wrong_password(db_session: AsyncSession):
    """authenticate returns None with wrong password."""
    user = await UserService.create_user(db_session, UserCreate(
        email="wrongpw@example.com", username="wrongpw", password="CorrectPass1",
    ))
    await db_session.commit()

    authed = await UserService.authenticate(db_session, "wrongpw", "WrongPassword1")
    assert authed is None


@pytest.mark.asyncio
async def test_authenticate_by_email(db_session: AsyncSession):
    """authenticate also supports email-based login."""
    user = await UserService.create_user(db_session, UserCreate(
        email="emailauth@example.com", username="emailauth", password="CorrectPass1",
    ))
    await db_session.commit()

    authed = await UserService.authenticate(db_session, "emailauth@example.com", "CorrectPass1")
    assert authed is not None
    assert authed.id == user.id


@pytest.mark.asyncio
async def test_update_user(db_session: AsyncSession):
    """update_user modifies user fields."""
    user = await UserService.create_user(db_session, UserCreate(
        email="update@example.com", username="updateuser", password="TestPass123",
    ))
    await db_session.commit()

    updated = await UserService.update_user(db_session, user.id, UserUpdate(
        display_name="Updated Name",
    ))
    assert updated is not None
    assert updated.display_name == "Updated Name"


@pytest.mark.asyncio
async def test_change_password_success(db_session: AsyncSession):
    """change_password allows changing with correct old password."""
    user = await UserService.create_user(db_session, UserCreate(
        email="chpw@example.com", username="chpw", password="OldPass123",
    ))
    await db_session.commit()

    success = await UserService.change_password(db_session, user.id, "OldPass123", "NewPass456")
    assert success is True

    # Verify old password no longer works
    authed = await UserService.authenticate(db_session, "chpw", "OldPass123")
    assert authed is None

    # Verify new password works
    authed = await UserService.authenticate(db_session, "chpw", "NewPass456")
    assert authed is not None


@pytest.mark.asyncio
async def test_change_password_wrong_old(db_session: AsyncSession):
    """change_password fails with wrong old password."""
    user = await UserService.create_user(db_session, UserCreate(
        email="badchpw@example.com", username="badchpw", password="OldPass123",
    ))
    await db_session.commit()

    success = await UserService.change_password(db_session, user.id, "WrongOldPass1", "NewPass456")
    assert success is False


@pytest.mark.asyncio
async def test_list_users(db_session: AsyncSession):
    """list_users returns paginated users."""
    # Create a few users
    for i in range(3):
        await UserService.create_user(db_session, UserCreate(
            email=f"list{i}@example.com", username=f"listuser{i}", password="TestPass123",
        ))
    await db_session.commit()

    users, total = await UserService.list_users(db_session, skip=0, limit=10)
    assert total >= 3
    assert len(users) >= 3


@pytest.mark.asyncio
async def test_list_users_pagination(db_session: AsyncSession):
    """list_users respects skip/limit."""
    for i in range(5):
        await UserService.create_user(db_session, UserCreate(
            email=f"page{i}@example.com", username=f"pageuser{i}", password="TestPass123",
        ))
    await db_session.commit()

    users, total = await UserService.list_users(db_session, skip=0, limit=2)
    assert len(users) <= 2
    assert total >= 5
