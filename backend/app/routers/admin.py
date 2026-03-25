"""
管理员路由
用户管理、任务管理、统计面板、邀请码管理
"""
import random
import string
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..utils.database import get_session
from ..routers.auth import get_current_user_from_request
from ..models.db_models import User, Job, InviteCode

router = APIRouter(prefix="/api/admin", tags=["管理员"])


# ==================== 依赖注入 ====================

async def get_current_admin(request: Request) -> User:
    """获取当前管理员用户"""
    user = await get_current_user_from_request(request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


# ==================== 响应模型 ====================

class StatsResponse(BaseModel):
    """统计数据响应"""
    total_users: int
    active_users: int
    total_jobs: int
    total_tokens: int


class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login_at: Optional[datetime]

    class Config:
        from_attributes = True


class JobResponse(BaseModel):
    """任务信息响应"""
    id: int
    user_id: int
    username: str
    name: Optional[str]
    status: str
    tokens_used: int
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class InviteCodeResponse(BaseModel):
    """邀请码响应"""
    id: int
    code: str
    description: Optional[str]
    is_active: bool
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class InviteCodeCreate(BaseModel):
    """创建邀请码请求"""
    code: Optional[str] = None      # 可选，不填则自动生成
    description: Optional[str] = None


# ==================== API 路由 ====================

@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """获取统计数据"""
    await get_current_admin(request)

    # 用户统计
    total_users = await session.scalar(select(func.count(User.id)))
    active_users = await session.scalar(
        select(func.count(User.id)).where(User.is_active == True)
    )

    # 任务统计
    total_jobs = await session.scalar(select(func.count(Job.id)))
    total_tokens = await session.scalar(
        select(func.sum(Job.tokens_used)).select_from(Job)
    ) or 0

    return StatsResponse(
        total_users=total_users or 0,
        active_users=active_users or 0,
        total_jobs=total_jobs or 0,
        total_tokens=total_tokens or 0
    )


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """获取用户列表"""
    await get_current_admin(request)

    result = await session.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return users


@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """禁用/启用用户"""
    admin = await get_current_admin(request)

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 不能禁用自己
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="不能禁用自己")

    user.is_active = not user.is_active
    await session.commit()

    return {"success": True, "is_active": user.is_active}


@router.get("/jobs", response_model=List[JobResponse])
async def get_jobs(
    request: Request,
    page: int = 1,
    page_size: int = 20,
    session: AsyncSession = Depends(get_session)
):
    """获取所有任务列表"""
    await get_current_admin(request)

    offset = (page - 1) * page_size

    # 联表查询获取用户名
    result = await session.execute(
        select(Job, User.username)
        .join(User, Job.user_id == User.id)
        .order_by(Job.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )

    jobs = []
    for row in result:
        job, username = row
        jobs.append(JobResponse(
            id=job.id,
            user_id=job.user_id,
            username=username,
            name=job.name,
            status=job.status,
            tokens_used=job.tokens_used or 0,
            created_at=job.created_at,
            completed_at=job.completed_at
        ))

    return jobs


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """删除任务"""
    await get_current_admin(request)

    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="任务不存在")

    await session.delete(job)
    await session.commit()

    return {"success": True}


# ==================== 邀请码管理 ====================

def generate_invite_code(length: int = 8) -> str:
    """生成随机邀请码"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


@router.get("/invite-codes", response_model=List[InviteCodeResponse])
async def get_invite_codes(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """获取邀请码列表"""
    admin = await get_current_admin(request)

    result = await session.execute(
        select(InviteCode).order_by(InviteCode.created_at.desc())
    )
    codes = result.scalars().all()
    return codes


@router.post("/invite-codes", response_model=InviteCodeResponse)
async def create_invite_code(
    request: Request,
    data: InviteCodeCreate,
    session: AsyncSession = Depends(get_session)
):
    """创建邀请码"""
    admin = await get_current_admin(request)

    # 如果指定了邀请码，使用指定的值
    if data.code:
        code = data.code.strip()
        # 验证长度（4-16位字符）
        if len(code) < 4 or len(code) > 16:
            raise HTTPException(status_code=400, detail="邀请码长度需在4-16位之间")
        # 检查是否已存在
        result = await session.execute(
            select(InviteCode).where(InviteCode.code == code)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="邀请码已存在")
    else:
        # 自动生成唯一邀请码
        code = generate_invite_code()
        while True:
            result = await session.execute(
                select(InviteCode).where(InviteCode.code == code)
            )
            if not result.scalar_one_or_none():
                break
            code = generate_invite_code()

    invite_code = InviteCode(
        code=code,
        description=data.description,
        is_active=True,
        created_by=admin.id
    )
    session.add(invite_code)
    await session.commit()
    await session.refresh(invite_code)

    return invite_code


@router.put("/invite-codes/{code_id}/toggle")
async def toggle_invite_code(
    code_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """启用/禁用邀请码"""
    await get_current_admin(request)

    result = await session.execute(
        select(InviteCode).where(InviteCode.id == code_id)
    )
    invite_code = result.scalar_one_or_none()

    if not invite_code:
        raise HTTPException(status_code=404, detail="邀请码不存在")

    invite_code.is_active = not invite_code.is_active
    await session.commit()

    return {"success": True, "is_active": invite_code.is_active}


@router.delete("/invite-codes/{code_id}")
async def delete_invite_code(
    code_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """删除邀请码"""
    await get_current_admin(request)

    result = await session.execute(
        select(InviteCode).where(InviteCode.id == code_id)
    )
    invite_code = result.scalar_one_or_none()

    if not invite_code:
        raise HTTPException(status_code=404, detail="邀请码不存在")

    await session.delete(invite_code)
    await session.commit()

    return {"success": True}