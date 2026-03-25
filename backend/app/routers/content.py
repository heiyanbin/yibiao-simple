"""内容相关API路由"""
from fastapi import APIRouter, HTTPException, Depends
from ..models.schemas import ContentGenerationRequest, ChapterContentRequest
from ..services.openai_service import OpenAIService
from ..utils.system_config import system_config
from ..utils.sse import sse_response
from ..routers.auth import get_current_user_from_request
import json

router = APIRouter(prefix="/api/content", tags=["内容管理"])


@router.post("/generate-chapter")
async def generate_chapter_content(
    request: ChapterContentRequest,
    current_user = Depends(get_current_user_from_request)
):
    """为单个章节生成内容（需要登录）"""
    try:
        # 检查系统是否已配置 API Key
        if not system_config.is_configured():
            raise HTTPException(status_code=400, detail="系统未配置 API Key，请联系管理员")

        # 创建OpenAI服务实例
        model_name = getattr(request, 'model_name', None)
        openai_service = OpenAIService(model_name=model_name)

        # 生成单章节内容
        content = ""
        async for chunk in openai_service._generate_chapter_content(
            chapter=request.chapter,
            parent_chapters=request.parent_chapters,
            sibling_chapters=request.sibling_chapters,
            project_overview=request.project_overview,
            custom_prompt=request.custom_prompt
        ):
            content += chunk

        return {"success": True, "content": content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"章节内容生成失败: {str(e)}")


@router.post("/generate-chapter-stream")
async def generate_chapter_content_stream(
    request: ChapterContentRequest,
    current_user = Depends(get_current_user_from_request)
):
    """流式为单个章节生成内容（需要登录）"""
    try:
        # 检查系统是否已配置 API Key
        if not system_config.is_configured():
            raise HTTPException(status_code=400, detail="系统未配置 API Key，请联系管理员")

        # 创建OpenAI服务实例
        model_name = getattr(request, 'model_name', None)
        openai_service = OpenAIService(model_name=model_name)

        async def generate():
            try:
                # 发送开始信号
                yield f"data: {json.dumps({'status': 'started', 'message': '开始生成章节内容...'}, ensure_ascii=False)}\n\n"

                # 流式生成章节内容
                full_content = ""
                async for chunk in openai_service._generate_chapter_content(
                    chapter=request.chapter,
                    parent_chapters=request.parent_chapters,
                    sibling_chapters=request.sibling_chapters,
                    project_overview=request.project_overview,
                    custom_prompt=request.custom_prompt
                ):
                    full_content += chunk
                    # 实时发送内容片段
                    yield f"data: {json.dumps({'status': 'streaming', 'content': chunk, 'full_content': full_content}, ensure_ascii=False)}\n\n"

                # 发送完成信号
                yield f"data: {json.dumps({'status': 'completed', 'content': full_content}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"章节内容生成异常: {str(e)}", exc_info=True)
                yield f"data: {json.dumps({'status': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

        return sse_response(generate())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"章节内容生成失败: {str(e)}")