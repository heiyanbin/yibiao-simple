"""
认证路由
用户注册、登录、登出等
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Response, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta

from ..utils.database import get_session, async_session_maker
from ..utils.auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token, hash_token, verify_token_hash
)
from ..models.db_models import User, UserSession, InviteCode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["认证"])


# ==================== 请求模型 ====================

class RegisterRequest(BaseModel):
    """注册请求"""
    username: str
    email: EmailStr
    password: str
    invite_code: str  # 邀请码
    real_name: Optional[str] = None    # 真实姓名
    department: Optional[str] = None    # 部门


class LoginRequest(BaseModel):
    """登录请求"""
    username: str
    password: str


class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: str
    real_name: Optional[str] = None
    department: Optional[str] = None
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """登录响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==================== 依赖注入 ====================

async def get_current_user(
    session: AsyncSession = Depends(get_session),
    # 从 Authorization header 获取 token
) -> User:
    """获取当前登录用户（依赖注入）"""
    from fastapi import Request

    # 这个函数会被实际使用时注入 request
    raise NotImplementedError("Use get_current_user_from_request instead")


async def get_current_user_from_request(request: Request) -> User:
    """从请求中获取当前用户"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning(f"未提供认证令牌, Authorization header: {auth_header}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证令牌"
        )

    token = auth_header.split(" ")[1]
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        logger.warning(f"无效或过期的令牌, payload: {payload}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效或过期的令牌"
        )

    user_id = int(payload.get("sub"))

    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在或已禁用"
            )

        return user


# ==================== 路由 ====================

@router.post("/register", response_model=UserResponse)
async def register(
    request: RegisterRequest,
    session: AsyncSession = Depends(get_session)
):
    """用户注册"""
    # 验证邀请码
    result = await session.execute(
        select(InviteCode).where(InviteCode.code == request.invite_code)
    )
    invite_code = result.scalar_one_or_none()

    if not invite_code:
        raise HTTPException(status_code=400, detail="邀请码无效")

    if not invite_code.is_active:
        raise HTTPException(status_code=400, detail="邀请码已被禁用")

    # 检查用户名是否已存在
    result = await session.execute(
        select(User).where(User.username == request.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名已存在")

    # 检查邮箱是否已存在
    result = await session.execute(
        select(User).where(User.email == request.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    # 创建用户
    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        real_name=request.real_name,
        department=request.department
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """用户登录"""
    # 查找用户
    result = await session.execute(
        select(User).where(User.username == request.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="账户已被禁用")

    # 生成令牌
    access_token = create_access_token(user.id, user.username)
    refresh_token = create_refresh_token(user.id)

    # 存储 refresh token
    session_obj = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    session.add(session_obj)

    # 更新最后登录时间
    user.last_login_at = datetime.utcnow()
    await session.commit()

    # 设置 refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # 开发环境设为 False，生产环境应为 True
        samesite="lax",
        max_age=7 * 24 * 60 * 60  # 7天
    )

    return LoginResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """刷新访问令牌"""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="未提供刷新令牌")

    # 解码刷新令牌
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="无效的刷新令牌")

    user_id = int(payload.get("sub"))

    # 验证存储的 refresh token
    result = await session.execute(
        select(UserSession).where(UserSession.user_id == user_id)
    )
    stored_session = result.scalar_one_or_none()

    if not stored_session or not verify_token_hash(refresh_token, stored_session.refresh_token_hash):
        raise HTTPException(status_code=401, detail="刷新令牌不匹配")

    # 检查是否过期
    if stored_session.expires_at < datetime.utcnow():
        await session.delete(stored_session)
        await session.commit()
        raise HTTPException(status_code=401, detail="刷新令牌已过期")

    # 获取用户
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或已禁用")

    # 生成新的令牌
    new_access_token = create_access_token(user.id, user.username)
    new_refresh_token = create_refresh_token(user.id)

    # 更新 refresh token
    stored_session.refresh_token_hash = hash_token(new_refresh_token)
    stored_session.expires_at = datetime.utcnow() + timedelta(days=7)
    await session.commit()

    # 设置新的 refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60
    )

    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """用户登出"""
    refresh_token = request.cookies.get("refresh_token")

    if refresh_token:
        # 删除该用户的所有 refresh token
        payload = decode_token(refresh_token)
        if payload:
            user_id = int(payload.get("sub"))
            result = await session.execute(
                select(UserSession).where(UserSession.user_id == user_id)
            )
            sessions = result.scalars().all()
            for s in sessions:
                await session.delete(s)
            await session.commit()

    # 清除 cookie
    response.delete_cookie("refresh_token")

    return {"message": "已成功登出"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """获取当前用户信息"""
    user = await get_current_user_from_request(request)
    return user