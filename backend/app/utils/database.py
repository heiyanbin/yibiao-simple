"""
数据库连接和会话管理
使用 SQLAlchemy 异步引擎
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from contextlib import asynccontextmanager
import os
from pathlib import Path

from ..models.db_models import Base, SystemConfig, AvailableModel


# 数据库文件路径
DB_DIR = Path.home() / ".ai_write_helper"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "app.db"

# 数据库 URL
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

# 创建异步引擎
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # 设置为 True 可以看到 SQL 语句
)

# 创建异步会话工厂
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    """初始化数据库，创建所有表"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(f"数据库初始化完成: {DB_PATH}")


async def get_session() -> AsyncSession:
    """获取数据库会话（用于依赖注入）"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


@asynccontextmanager
async def get_db_session():
    """数据库会话上下文管理器"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_system_config() -> SystemConfig:
    """获取系统配置"""
    async with async_session_maker() as session:
        result = await session.execute(
            select(SystemConfig).where(SystemConfig.is_active == True)
        )
        config = result.scalar_one_or_none()
        return config


async def get_available_models() -> list[str]:
    """获取可用模型列表"""
    async with async_session_maker() as session:
        result = await session.execute(
            select(AvailableModel).where(AvailableModel.is_active == True)
        )
        models = result.scalars().all()
        return [m.model_name for m in models]