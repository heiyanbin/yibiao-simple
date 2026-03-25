"""配置相关API路由"""
from fastapi import APIRouter, HTTPException
from ..models.schemas import ModelListResponse
from ..utils.system_config import system_config
from ..utils.prompt_manager import get_all_default_prompts

router = APIRouter(prefix="/api/config", tags=["配置管理"])


@router.get("/models")
async def get_available_models():
    """获取系统配置的可用模型列表"""
    try:
        models = system_config.get_models()

        if not models:
            return ModelListResponse(
                models=[],
                success=False,
                message="系统未配置可用模型，请联系管理员"
            )

        return ModelListResponse(
            models=models,
            success=True,
            message=f"获取到 {len(models)} 个可用模型"
        )

    except Exception as e:
        return ModelListResponse(
            models=[],
            success=False,
            message=f"获取模型列表失败: {str(e)}"
        )


@router.get("/status")
async def get_config_status():
    """获取系统配置状态（是否已配置 API Key）"""
    return {
        "configured": system_config.is_configured()
    }


@router.get("/prompts")
async def get_prompts():
    """获取默认提示词"""
    try:
        prompts = get_all_default_prompts()
        return {
            "success": True,
            "prompts": prompts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取提示词失败: {str(e)}")