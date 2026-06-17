"""
通用工具函数
"""
import json
from datetime import datetime
from typing import Any, Dict, Optional


def safe_float(value: Any, default: Optional[float] = None) -> Optional[float]:
    """安全转换为浮点数"""
    if value is None or value == "" or value == "--":
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_div(a: Optional[float], b: Optional[float], default: Optional[float] = None) -> Optional[float]:
    """安全除法"""
    if a is None or b is None or b == 0:
        return default
    return a / b


def format_number(num: Optional[float], precision: int = 2) -> Optional[str]:
    """格式化数字（万/亿）"""
    if num is None:
        return None
    if abs(num) >= 1e8:
        return f"{num / 1e8:.{precision}f}亿"
    elif abs(num) >= 1e4:
        return f"{num / 1e4:.{precision}f}万"
    else:
        return f"{num:.{precision}f}"


def yoy_growth(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    """计算同比增长率"""
    if current is None or previous is None or previous == 0:
        return None
    return (current - previous) / abs(previous) * 100


def cagr(start: float, end: float, years: int) -> Optional[float]:
    """计算复合年增长率"""
    if start <= 0 or end <= 0 or years <= 0:
        return None
    return (end / start) ** (1 / years) - 1


def dump_json(data: Any) -> str:
    """序列化为 JSON 字符串"""
    return json.dumps(data, ensure_ascii=False, default=str)


def load_json(text: Optional[str]) -> Any:
    """从 JSON 字符串反序列化"""
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def get_report_period(fiscal_year: int, period: str) -> str:
    """获取报告期字符串"""
    period_map = {"Q1": "03-31", "Q2": "06-30", "Q3": "09-30", "Q4": "12-31"}
    return f"{fiscal_year}-{period_map.get(period, '12-31')}"
