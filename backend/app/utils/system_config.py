"""
系统配置管理
管理 API Key 和其他系统级配置
"""
import json
import os
import secrets
from pathlib import Path
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


# 系统配置文件路径
CONFIG_DIR = Path.home() / ".ai_write_helper"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
SYSTEM_CONFIG_FILE = CONFIG_DIR / "system_config.json"


class SystemConfigManager:
    """系统配置管理器"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._config = None
        return cls._instance

    def _load_config(self) -> dict:
        """加载配置文件"""
        if self._config is not None:
            return self._config

        if not SYSTEM_CONFIG_FILE.exists():
            # 创建默认配置
            default_config = {
                "api_key": "",
                "base_url": "",
                "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
                "jwt_secret": secrets.token_hex(32)  # 持久化的 JWT 密钥
            }
            self._save_config(default_config)
            self._config = default_config
            logger.info(f"创建默认系统配置文件: {SYSTEM_CONFIG_FILE}")
        else:
            with open(SYSTEM_CONFIG_FILE, 'r', encoding='utf-8') as f:
                self._config = json.load(f)
            logger.info(f"加载系统配置文件: {SYSTEM_CONFIG_FILE}")

        return self._config

    def _save_config(self, config: dict):
        """保存配置文件"""
        with open(SYSTEM_CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        self._config = config
        logger.info(f"保存系统配置文件: {SYSTEM_CONFIG_FILE}")

    def get_api_key(self) -> str:
        """获取 API Key"""
        config = self._load_config()
        return config.get("api_key", "")

    def get_base_url(self) -> str:
        """获取 Base URL"""
        config = self._load_config()
        return config.get("base_url", "")

    def get_models(self) -> List[str]:
        """获取可用模型列表"""
        config = self._load_config()
        return config.get("models", ["gpt-3.5-turbo"])

    def set_api_key(self, api_key: str, base_url: str = ""):
        """设置 API Key 和 Base URL"""
        config = self._load_config()
        config["api_key"] = api_key
        config["base_url"] = base_url
        self._save_config(config)
        logger.info("API Key 已更新")

    def set_models(self, models: List[str]):
        """设置可用模型列表"""
        config = self._load_config()
        config["models"] = models
        self._save_config(config)
        logger.info(f"模型列表已更新: {models}")

    def is_configured(self) -> bool:
        """检查是否已配置 API Key"""
        return bool(self.get_api_key())

    def get_jwt_secret(self) -> str:
        """获取 JWT 密钥"""
        config = self._load_config()
        jwt_secret = config.get("jwt_secret")
        if not jwt_secret:
            # 如果没有，生成一个新的并保存
            jwt_secret = secrets.token_hex(32)
            config["jwt_secret"] = jwt_secret
            self._save_config(config)
        return jwt_secret

    def reload(self):
        """重新加载配置"""
        self._config = None
        self._load_config()


# 全局实例
system_config = SystemConfigManager()