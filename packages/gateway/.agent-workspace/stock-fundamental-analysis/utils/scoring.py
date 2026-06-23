"""
多维评分引擎
- 质量评分(Quality): 盈利能力 + 现金流质量 + 盈利稳定性
- 价值评分(Value): 估值水平 vs 历史/行业分位
- 成长评分(Growth): 营收/利润增速 + 持续性
- 健康评分(Health): 负债结构 + 流动性 + 现金流覆盖
- 综合评分: 加权平均
"""
import numpy as np
import pandas as pd
from typing import Dict, Optional, Tuple


# 权重配置
WEIGHTS = {
    "quality": 0.30,   # 质量
    "value": 0.25,     # 价值
    "growth": 0.25,    # 成长
    "health": 0.20,    # 健康
}

# 各维度子指标及理想方向（higher_is_better）
SUB_METRICS = {
    "quality": {
        "roe": True,
        "roa": True,
        "roic": True,
        "gross_margin": True,
        "net_margin": True,
        "operating_cashflow_ratio": True,
        "free_cashflow_yield": True,
    },
    "value": {
        "pe_ratio": False,
        "pb_ratio": False,
        "ps_ratio": False,
        "pcf_ratio": False,
        "ev_ebitda": False,
        "peg_ratio": False,
        "dividend_yield": True,
    },
    "growth": {
        "revenue_growth_yoy": True,
        "net_profit_growth_yoy": True,
        "revenue_growth_3y_cagr": True,
        "net_profit_growth_3y_cagr": True,
        "eps_growth": True,
    },
    "health": {
        "current_ratio": True,
        "quick_ratio": True,
        "debt_to_equity": False,
        "interest_coverage": True,
    },
}


def percentile_score(value: float, distribution: np.ndarray, higher_is_better: bool = True) -> float:
    """
    基于分布百分位计算 0-100 评分
    """
    if np.isnan(value) or len(distribution) == 0:
        return 50.0  # 缺失值给中性分
    dist = distribution[~np.isnan(distribution)]
    if len(dist) == 0:
        return 50.0
    pct = (dist < value).sum() / len(dist) * 100
    if not higher_is_better:
        pct = 100 - pct
    return np.clip(pct, 0, 100)


def compute_dimension_score(
    row: pd.Series, pool: pd.DataFrame, dimension: str
) -> float:
    """计算单个维度的加权评分"""
    metrics = SUB_METRICS.get(dimension, {})
    if not metrics:
        return 50.0
    
    scores = []
    for metric, higher_is_better in metrics.items():
        if metric not in row.index or metric not in pool.columns:
            continue
        val = row[metric]
        dist = pool[metric].values
        s = percentile_score(val, dist, higher_is_better)
        scores.append(s)
    
    return float(np.mean(scores)) if scores else 50.0


def compute_all_scores(
    stock_metrics: pd.DataFrame, industry_pool: pd.DataFrame
) -> pd.DataFrame:
    """
    计算所有评分
    stock_metrics: 目标股票的指标 DataFrame（一行或多行）
    industry_pool: 同行业/全市场的全部股票最新指标，用于计算百分位
    返回追加了 quality_score, value_score, growth_score, health_score, overall_score 的 DataFrame
    """
    result = stock_metrics.copy()
    
    scores_list = []
    for _, row in result.iterrows():
        q = compute_dimension_score(row, industry_pool, "quality")
        v = compute_dimension_score(row, industry_pool, "value")
        g = compute_dimension_score(row, industry_pool, "growth")
        h = compute_dimension_score(row, industry_pool, "health")
        overall = (
            q * WEIGHTS["quality"]
            + v * WEIGHTS["value"]
            + g * WEIGHTS["growth"]
            + h * WEIGHTS["health"]
        )
        scores_list.append({
            "quality_score": round(q, 1),
            "value_score": round(v, 1),
            "growth_score": round(g, 1),
            "health_score": round(h, 1),
            "overall_score": round(overall, 1),
        })
    
    scores_df = pd.DataFrame(scores_list, index=result.index)
    return pd.concat([result, scores_df], axis=1)


def score_to_rating(overall_score: float) -> str:
    """综合评分 → 推荐评级"""
    if overall_score >= 80:
        return "强烈推荐"
    elif overall_score >= 65:
        return "推荐"
    elif overall_score >= 50:
        return "中性"
    elif overall_score >= 35:
        return "谨慎"
    else:
        return "回避"


def score_to_risk_level(score: float) -> str:
    """评分 → 风险等级"""
    if score >= 75:
        return "low"
    elif score >= 50:
        return "medium"
    else:
        return "high"
