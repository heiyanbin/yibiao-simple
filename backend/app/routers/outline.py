"""目录相关API路由"""
from fastapi import APIRouter, HTTPException
from ..models.schemas import OutlineRequest, OutlineResponse
from ..services.openai_service import OpenAIService
from ..utils.config_manager import config_manager
from ..utils import prompt_manager
from ..utils.sse import sse_response
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/outline", tags=["目录管理"])


@router.post("/generate")
async def generate_outline(request: OutlineRequest):
    """生成标书目录结构（以SSE流式返回）"""
    try:
        logger.info("收到目录生成请求 (generate)")
        # 加载配置
        config = config_manager.load_config()

        if not config.get('api_key'):
            logger.error("API密钥未配置")
            raise HTTPException(status_code=400, detail="请先配置OpenAI API密钥")

        # 创建OpenAI服务实例
        openai_service = OpenAIService()

        async def generate():
            try:
                logger.info("开始生成目录...")
                # 后台计算主任务
                compute_task = asyncio.create_task(openai_service.generate_outline_v2(
                    overview=request.overview,
                    requirements=request.requirements
                ))

                # 在等待计算完成期间发送心跳，保持连接（发送空字符串chunk）
                while not compute_task.done():
                    yield f"data: {json.dumps({'chunk': ''}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(1)

                # 计算完成
                result = await compute_task
                logger.info(f"目录生成完成，包含 {len(result.get('outline', []))} 个一级标题")

                # 确保为字符串
                if isinstance(result, dict):
                    result_str = json.dumps(result, ensure_ascii=False)
                else:
                    result_str = str(result)

                # 分片发送实际数据
                chunk_size = 128
                chunk_delay = 0.1  # 每个分片之间增加一点点延迟，增强SSE逐步展示效果
                for i in range(0, len(result_str), chunk_size):
                    piece = result_str[i:i+chunk_size]
                    yield f"data: {json.dumps({'chunk': piece}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(chunk_delay)
                # 发送结束信号
                yield "data: [DONE]\n\n"
            except Exception as e:
                # 捕获后台任务中的异常，通过 SSE 友好返回给前端
                error_message = f"目录生成失败: {str(e)}"
                logger.error(f"目录生成异常: {str(e)}", exc_info=True)
                payload = {
                    "chunk": "",
                    "error": True,
                    "message": error_message,
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

        return sse_response(generate())

    except Exception as e:
        logger.error(f"目录生成请求失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"目录生成失败: {str(e)}")


@router.post("/generate-stream")
async def generate_outline_stream(request: OutlineRequest):
    """流式生成标书目录结构"""
    try:
        logger.info("收到目录生成请求 (generate-stream)")
        # 加载配置
        config = config_manager.load_config()

        if not config.get('api_key'):
            logger.error("API密钥未配置")
            raise HTTPException(status_code=400, detail="请先配置OpenAI API密钥")

        # 创建OpenAI服务实例
        openai_service = OpenAIService()
        # request.uploadedExpand
        async def generate():
            try:
                if request.uploaded_expand:
                    logger.info("使用方案扩写模式生成目录")
                    system_prompt, user_prompt = prompt_manager.generate_outline_with_old_prompt(request.overview, request.requirements, request.old_outline)
                    messages = [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]

                    full_content = ""
                    async for chunk in openai_service.stream_chat_completion(messages, temperature=0.7, response_format={"type": "json_object"}):
                        full_content += chunk
                    logger.info(f"方案扩写模式生成完成，内容长度: {len(full_content)}")
                    # 流式返回目录生成结果
                    # async for chunk in openai_service.stream_chat_completion(messages, temperature=0.7, response_format={"type": "json_object"}):
                    #     yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"

                    # 发送结束信号
                    # yield "data: [DONE]\n\n"

                else:
                    logger.info("使用普通模式生成目录")
                    system_prompt, user_prompt = prompt_manager.generate_outline_prompt(request.overview, request.requirements)

                    messages = [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]

                    # 流式返回目录生成结果
                    async for chunk in openai_service.stream_chat_completion(messages, temperature=0.7, response_format={"type": "json_object"}):
                        yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"

                    # 发送结束信号
                    yield "data: [DONE]\n\n"
                    logger.info("目录生成完成")

            except Exception as e:
                logger.error(f"目录生成异常: {str(e)}", exc_info=True)
                yield f"data: {json.dumps({'error': True, 'message': str(e)}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"

        return sse_response(generate())

    except Exception as e:
        logger.error(f"目录生成请求失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"目录生成失败: {str(e)}")




