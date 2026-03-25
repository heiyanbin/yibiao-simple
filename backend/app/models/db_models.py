"""
数据库模型定义
使用 SQLAlchemy ORM 定义多租户数据结构
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.ext.asyncio import AsyncAttrs
import enum
import json


class Base(AsyncAttrs, DeclarativeBase):
    """SQLAlchemy 基类"""
    pass


class JobStatus(str, enum.Enum):
    """任务状态枚举"""
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class PromptType(str, enum.Enum):
    """提示词类型枚举"""
    OVERVIEW = "overview"           # 项目概述提取
    REQUIREMENTS = "requirements"   # 技术评分要求提取
    FULL_OUTLINE = "full_outline"   # 完整目录生成
    CHAPTER_CONTENT = "chapter_content"  # 章节内容生成


# ==================== 系统配置表 ====================

class SystemConfig(Base):
    """系统配置表 - 存储 API Key 等敏感信息"""
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    api_key = Column(Text, nullable=False)  # API Key（可选加密存储）
    base_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AvailableModel(Base):
    """可用模型表 - 系统配置的可用模型列表"""
    __tablename__ = "available_models"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== 用户相关表 ====================

class InviteCode(Base):
    """邀请码表"""
    __tablename__ = "invite_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(16), unique=True, nullable=False)  # 邀请码
    description = Column(String(200), nullable=True)         # 备注（如"市场部"）
    is_active = Column(Boolean, default=True)                # 是否启用
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # 创建者
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    real_name = Column(String(50), nullable=True)     # 真实姓名
    department = Column(String(100), nullable=True)   # 部门
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    # 关系
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    prompts = relationship("UserPrompt", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    """用户会话表 - 存储 Refresh Token"""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    refresh_token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    user = relationship("User", back_populates="sessions")


# ==================== 用户提示词表 ====================

class UserPrompt(Base):
    """用户自定义提示词表"""
    __tablename__ = "user_prompts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    prompt_type = Column(String(50), nullable=False)  # 使用字符串而不是枚举，便于存储
    content = Column(Text, nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user = relationship("User", back_populates="prompts")


# ==================== 任务相关表 ====================

class Job(Base):
    """任务表 - 一次使用即一个任务"""
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=True)
    status = Column(String(20), default=JobStatus.IN_PROGRESS.value)

    # 输入数据
    source_file_path = Column(Text, nullable=True)  # 上传的源文件路径
    source_file_name = Column(String(255), nullable=True)  # 源文件名
    file_content = Column(Text, nullable=True)  # 提取的文本内容

    # 分析结果
    project_overview = Column(Text, nullable=True)
    tech_requirements = Column(Text, nullable=True)

    # 目录结构 (JSON)
    outline_data = Column(Text, nullable=True)

    # 输出文件
    output_file_path = Column(Text, nullable=True)

    # 元数据
    selected_model = Column(String(100), nullable=True)
    tokens_used = Column(Integer, default=0)

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # 关系
    user = relationship("User", back_populates="jobs")
    job_prompts = relationship("JobPrompt", back_populates="job", cascade="all, delete-orphan")
    job_contents = relationship("JobContent", back_populates="job", cascade="all, delete-orphan")

    def get_outline_data(self):
        """获取解析后的目录数据"""
        if self.outline_data:
            return json.loads(self.outline_data)
        return None

    def set_outline_data(self, data):
        """设置目录数据"""
        self.outline_data = json.dumps(data, ensure_ascii=False)


class JobPrompt(Base):
    """任务提示词表 - 记录任务使用的提示词快照"""
    __tablename__ = "job_prompts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    prompt_type = Column(String(50), nullable=False)
    prompt_content = Column(Text, nullable=False)  # 提示词快照
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    job = relationship("Job", back_populates="job_prompts")


class JobContent(Base):
    """任务内容表 - 存储各章节生成的内容"""
    __tablename__ = "job_content"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    chapter_id = Column(String(50), nullable=False)  # 如 "1.2.3"
    chapter_title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    job = relationship("Job", back_populates="job_contents")