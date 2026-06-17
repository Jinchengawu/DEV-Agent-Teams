"""
系统配置
"""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""

    # 基础配置
    APP_NAME: str = "股票基本面深度尽调分析系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    # 数据库配置
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/stock_dds"
    DATABASE_ECHO: bool = False

    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 3600

    # Celery 配置
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # 数据源 API
    TUSHARE_TOKEN: Optional[str] = None
    EASTMONEY_API: str = "https://push2.eastmoney.com/api/qt"

    # 分析参数
    DCF_DEFAULT_DISCOUNT_RATE: float = 0.10
    DCF_DEFAULT_GROWTH_RATE: float = 0.03
    DCF_PROJECTION_YEARS: int = 5
    RISK_FREE_RATE: float = 0.025

    # 报告配置
    REPORT_OUTPUT_DIR: str = "./reports"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
