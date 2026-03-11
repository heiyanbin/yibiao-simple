"""FastAPI应用主入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import sys
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
import fastapi.middleware.cors
import starlette.middleware.cors

from .config import settings
from .routers import config, document, outline, content, search, expand


def setup_logging():
    """配置日志系统"""
    # 日志目录
    log_dir = Path.home() / ".ai_write_helper" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "app.log"

    # 根日志器
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # 日志格式
    log_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 文件处理器 - 按天滚动，保留7天
    file_handler = TimedRotatingFileHandler(
        log_file,
        when="midnight",
        interval=1,
        backupCount=7,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(log_format)
    file_handler.suffix = "%Y-%m-%d"

    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(log_format)

    # 添加处理器
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    # 降低第三方库的日志级别
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    return logging.getLogger(__name__)


# 初始化日志
logger = setup_logging()
logger.info(f"日志系统初始化完成，日志文件: {Path.home() / '.ai_write_helper' / 'logs' / 'app.log'}")

# 创建FastAPI应用实例
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="基于FastAPI的AI写标书助手后端API"
)
logger.info(f"FastAPI应用创建: {settings.app_name} v{settings.app_version}")


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info("应用启动完成")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    logger.info("应用正在关闭...")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(config.router)
app.include_router(document.router)
app.include_router(outline.router)
app.include_router(content.router)
app.include_router(search.router)
app.include_router(expand.router)

# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version
    }

# 静态文件服务（用于服务前端构建文件）
if os.path.exists("static"):
    # 挂载静态资源文件夹
    app.mount("/static", StaticFiles(directory="static/static"), name="static")
    
    # 处理React应用的路由（SPA路由支持）
    @app.get("/")
    async def read_index():
        """根路径，返回前端首页"""
        return FileResponse("static/index.html")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """处理React路由，所有非API路径都返回index.html"""
        # 排除API路径
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("health"):
            # 这些路径应该由FastAPI处理，如果到这里说明404
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # 检查是否是静态文件
        static_file_path = os.path.join("static", full_path)
        if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
            return FileResponse(static_file_path)
        
        # 对于其他所有路径，返回React应用的index.html（SPA路由）
        return FileResponse("static/index.html")
else:
    # 如果没有静态文件，返回API信息
    @app.get("/")
    async def read_root():
        """根路径，返回API信息"""
        return {
            "message": f"欢迎使用 {settings.app_name} API",
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/health"
        }