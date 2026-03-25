"""
任务路由
任务的创建、查询、更新、删除
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import os

from ..utils.database import get_session, async_session_maker
from ..models.db_models import Job, JobContent, JobPrompt, JobStatus
from ..routers.auth import get_current_user_from_request
from fastapi import Request

router = APIRouter(prefix="/api/jobs", tags=["任务管理"])


# ==================== 请求/响应模型 ====================

class JobCreate(BaseModel):
    """创建任务请求"""
    name: Optional[str] = None


class JobUpdate(BaseModel):
    """更新任务请求"""
    name: Optional[str] = None
    status: Optional[str] = None
    project_overview: Optional[str] = None
    tech_requirements: Optional[str] = None
    outline_data: Optional[dict] = None
    selected_model: Optional[str] = None


class JobContentCreate(BaseModel):
    """创建章节内容请求"""
    chapter_id: str
    chapter_title: Optional[str] = None
    content: str


class JobResponse(BaseModel):
    """任务响应"""
    id: int
    name: Optional[str]
    status: str
    source_file_name: Optional[str]
    selected_model: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class JobDetailResponse(BaseModel):
    """任务详情响应"""
    id: int
    name: Optional[str]
    status: str
    source_file_path: Optional[str]
    source_file_name: Optional[str]
    file_content: Optional[str]
    project_overview: Optional[str]
    tech_requirements: Optional[str]
    outline_data: Optional[dict]
    selected_model: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class JobContentResponse(BaseModel):
    """章节内容响应"""
    id: int
    chapter_id: str
    chapter_title: Optional[str]
    content: Optional[str]

    class Config:
        from_attributes = True


# ==================== 路由 ====================

@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    request: Request = None,
    session: AsyncSession = Depends(get_session)
):
    """获取当前用户的任务列表"""
    user = await get_current_user_from_request(request)

    query = select(Job).where(Job.user_id == user.id)

    if status:
        query = query.where(Job.status == status)

    query = query.order_by(desc(Job.created_at)).offset(offset).limit(limit)

    result = await session.execute(query)
    jobs = result.scalars().all()

    return jobs


@router.post("/", response_model=JobResponse)
async def create_job(
    job_create: JobCreate,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """创建新任务"""
    user = await get_current_user_from_request(request)

    job = Job(
        user_id=user.id,
        name=job_create.name or f"任务 {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    # 创建任务目录
    job_dir = os.path.join("uploads", f"user_{user.id}", f"job_{job.id}")
    os.makedirs(job_dir, exist_ok=True)

    return job


@router.get("/{job_id}", response_model=JobDetailResponse)
async def get_job(
    job_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """获取任务详情"""
    user = await get_current_user_from_request(request)

    result = await session.execute(
        select(Job).where(Job.id == job_id, Job.user_id == user.id)
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 构建响应数据，解析 JSON 字符串
    response_dict = {
        "id": job.id,
        "name": job.name,
        "status": job.status,
        "source_file_path": job.source_file_path,
        "source_file_name": job.source_file_name,
        "file_content": job.file_content,
        "project_overview": job.project_overview,
        "tech_requirements": job.tech_requirements,
        "outline_data": json.loads(job.outline_data) if job.outline_data else None,
        "selected_model": job.selected_model,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
    }

    return JobDetailResponse(**response_dict)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_update: JobUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """更新任务"""
    user = await get_current_user_from_request(request)

    result = await session.execute(
        select(Job).where(Job.id == job_id, Job.user_id == user.id)
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 更新字段
    if job_update.name is not None:
        job.name = job_update.name
    if job_update.status is not None:
        job.status = job_update.status
        if job_update.status == JobStatus.COMPLETED.value:
            job.completed_at = datetime.utcnow()
    if job_update.project_overview is not None:
        job.project_overview = job_update.project_overview
    if job_update.tech_requirements is not None:
        job.tech_requirements = job_update.tech_requirements
    if job_update.outline_data is not None:
        job.outline_data = json.dumps(job_update.outline_data, ensure_ascii=False)
    if job_update.selected_model is not None:
        job.selected_model = job_update.selected_model

    await session.commit()
    await session.refresh(job)

    return job


@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """删除任务"""
    user = await get_current_user_from_request(request)

    result = await session.execute(
        select(Job).where(Job.id == job_id, Job.user_id == user.id)
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 删除任务目录
    job_dir = os.path.join("uploads", f"user_{user.id}", f"job_{job_id}")
    if os.path.exists(job_dir):
        import shutil
        shutil.rmtree(job_dir)

    await session.delete(job)
    await session.commit()

    return {"message": "任务已删除"}


# ==================== 章节内容管理 ====================

@router.get("/{job_id}/contents", response_model=List[JobContentResponse])
async def list_job_contents(
    job_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """获取任务的所有章节内容"""
    user = await get_current_user_from_request(request)

    # 验证任务所有权
    result = await session.execute(
        select(Job).where(Job.id == job_id, Job.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="任务不存在")

    result = await session.execute(
        select(JobContent).where(JobContent.job_id == job_id)
    )
    contents = result.scalars().all()

    return contents


@router.post("/{job_id}/contents", response_model=JobContentResponse)
async def save_job_content(
    job_id: int,
    content_create: JobContentCreate,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """保存章节内容"""
    user = await get_current_user_from_request(request)

    # 验证任务所有权
    result = await session.execute(
        select(Job).where(Job.id == job_id, Job.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="任务不存在")

    # 检查是否已存在
    result = await session.execute(
        select(JobContent).where(
            JobContent.job_id == job_id,
            JobContent.chapter_id == content_create.chapter_id
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # 更新
        existing.chapter_title = content_create.chapter_title
        existing.content = content_create.content
        await session.commit()
        await session.refresh(existing)
        return existing
    else:
        # 创建
        content = JobContent(
            job_id=job_id,
            chapter_id=content_create.chapter_id,
            chapter_title=content_create.chapter_title,
            content=content_create.content
        )
        session.add(content)
        await session.commit()
        await session.refresh(content)
        return content