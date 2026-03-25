"""
用户提示词路由
用户自定义提示词的 CRUD 操作
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ..utils.database import get_session
from ..models.db_models import UserPrompt, PromptType
from ..routers.auth import get_current_user_from_request
from fastapi import Request

router = APIRouter(prefix="/api/prompts", tags=["用户提示词"])


# ==================== 请求/响应模型 ====================

class PromptCreate(BaseModel):
    """创建提示词请求"""
    name: str
    prompt_type: str  # overview, requirements, full_outline, chapter_content
    content: str
    is_default: bool = False


class PromptUpdate(BaseModel):
    """更新提示词请求"""
    name: Optional[str] = None
    content: Optional[str] = None
    is_default: Optional[bool] = None


class PromptResponse(BaseModel):
    """提示词响应"""
    id: int
    name: str
    prompt_type: str
    content: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== 路由 ====================

@router.get("/", response_model=List[PromptResponse])
async def list_prompts(
    prompt_type: Optional[str] = None,
    request: Request = None,
    session: AsyncSession = Depends(get_session)
):
    """获取当前用户的提示词列表"""
    user = await get_current_user_from_request(request)

    query = select(UserPrompt).where(UserPrompt.user_id == user.id)

    if prompt_type:
        query = query.where(UserPrompt.prompt_type == prompt_type)

    query = query.order_by(UserPrompt.prompt_type, UserPrompt.created_at.desc())

    result = await session.execute(query)
    prompts = result.scalars().all()

    return prompts


@router.post("/", response_model=PromptResponse)
async def create_prompt(
    prompt_create: PromptCreate,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """创建提示词"""
    user = await get_current_user_from_request(request)

    # 验证 prompt_type
    valid_types = [pt.value for pt in PromptType]
    if prompt_create.prompt_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"无效的提示词类型，有效类型: {valid_types}"
        )

    # 检查同名提示词是否存在
    result = await session.execute(
        select(UserPrompt).where(
            UserPrompt.user_id == user.id,
            UserPrompt.name == prompt_create.name,
            UserPrompt.prompt_type == prompt_create.prompt_type
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该类型下已存在同名提示词")

    # 如果设为默认，取消同类型的其他默认
    if prompt_create.is_default:
        result = await session.execute(
            select(UserPrompt).where(
                UserPrompt.user_id == user.id,
                UserPrompt.prompt_type == prompt_create.prompt_type,
                UserPrompt.is_default == True
            )
        )
        for existing in result.scalars().all():
            existing.is_default = False

    prompt = UserPrompt(
        user_id=user.id,
        name=prompt_create.name,
        prompt_type=prompt_create.prompt_type,
        content=prompt_create.content,
        is_default=prompt_create.is_default
    )
    session.add(prompt)
    await session.commit()
    await session.refresh(prompt)

    return prompt


@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """获取提示词详情"""
    user = await get_current_user_from_request(request)

    result = await session.execute(
        select(UserPrompt).where(
            UserPrompt.id == prompt_id,
            UserPrompt.user_id == user.id
        )
    )
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")

    return prompt


@router.put("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: int,
    prompt_update: PromptUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """更新提示词"""
    user = await get_current_user_from_request(request)

    result = await session.execute(
        select(UserPrompt).where(
            UserPrompt.id == prompt_id,
            UserPrompt.user_id == user.id
        )
    )
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")

    # 更新字段
    if prompt_update.name is not None:
        # 检查新名称是否冲突
        result = await session.execute(
            select(UserPrompt).where(
                UserPrompt.user_id == user.id,
                UserPrompt.name == prompt_update.name,
                UserPrompt.prompt_type == prompt.prompt_type,
                UserPrompt.id != prompt_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="该类型下已存在同名提示词")
        prompt.name = prompt_update.name

    if prompt_update.content is not None:
        prompt.content = prompt_update.content

    if prompt_update.is_default is not None:
        if prompt_update.is_default:
            # 取消同类型的其他默认
            result = await session.execute(
                select(UserPrompt).where(
                    UserPrompt.user_id == user.id,
                    UserPrompt.prompt_type == prompt.prompt_type,
                    UserPrompt.is_default == True,
                    UserPrompt.id != prompt_id
                )
            )
            for existing in result.scalars().all():
                existing.is_default = False
        prompt.is_default = prompt_update.is_default

    await session.commit()
    await session.refresh(prompt)

    return prompt


@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """删除提示词"""
    user = await get_current_user_from_request(request)

    result = await session.execute(
        select(UserPrompt).where(
            UserPrompt.id == prompt_id,
            UserPrompt.user_id == user.id
        )
    )
    prompt = result.scalar_one_or_none()

    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")

    await session.delete(prompt)
    await session.commit()

    return {"message": "提示词已删除"}


@router.get("/types/list")
async def list_prompt_types():
    """获取所有提示词类型"""
    return {
        "types": [
            {"value": pt.value, "label": _get_prompt_type_label(pt.value)}
            for pt in PromptType
        ]
    }


def _get_prompt_type_label(prompt_type: str) -> str:
    """获取提示词类型的中文标签"""
    labels = {
        "overview": "项目概述提取",
        "requirements": "技术评分要求提取",
        "full_outline": "完整目录生成",
        "chapter_content": "章节内容生成"
    }
    return labels.get(prompt_type, prompt_type)