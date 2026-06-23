"""
财务指标计算引擎 — 基于 Pandas 向量化批量计算
所有输入单位为"万元"，百分比指标返回不带%号的数值
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional


def compute_all_ratios(df: pd.DataFrame) -> pd.DataFrame:
    """
    输入：财务报表 DataFrame（需包含 FinancialStatement 全部字段）
    输出：追加了所有计算指标列的 DataFrame
    """
    df = df.copy()
    
    # ===== 盈利能力 =====
    df["gross_margin"] = np.where(df["revenue"] > 0, df["gross_profit"] / df["revenue"] * 100, None)
    df["net_margin"] = np.where(df["revenue"] > 0, df["net_profit"] / df["revenue"] * 100, None)
    df["roe"] = np.where(df["total_equity"] > 0, df["net_profit"] / df["total_equity"] * 100, None)
    df["roa"] = np.where(df["total_assets"] > 0, df["net_profit"] / df["total_assets"] * 100, None)
    # ROIC = NOPAT / (有息负债 + 股东权益 - 货币资金)
    invested_capital = df["debt"].fillna(0) + df["total_equity"].fillna(0) - df["cash_and_equivalents"].fillna(0)
    df["roic"] = np.where(invested_capital > 0, df["net_profit"] / invested_capital * 100, None)
    
    # ===== 成长性（需按 stock_id 分组 shift 计算同比） =====
    df = df.sort_values(["stock_id", "report_date"])
    
    # 单季度同比（同一报告类型比较）
    df["revenue_growth_yoy"] = df.groupby("stock_id")["revenue"].transform(
        lambda x: x.pct_change(periods=4) * 100
    )
    df["net_profit_growth_yoy"] = df.groupby("stock_id")["net_profit"].transform(
        lambda x: x.pct_change(periods=4) * 100
    )
    
    # 3年 CAGR
    df["revenue_growth_3y_cagr"] = df.groupby("stock_id")["revenue"].transform(
        lambda x: (x / x.shift(12)) ** (1/3) - 1
    ) * 100
    df["net_profit_growth_3y_cagr"] = df.groupby("stock_id")["net_profit"].transform(
        lambda x: (x / x.shift(12)) ** (1/3) - 1
    ) * 100
    
    # ===== 财务健康 =====
    df["current_ratio"] = np.where(
        df["current_liabilities"] > 0, df["current_assets"] / df["current_liabilities"], None
    )
    df["quick_ratio"] = np.where(
        df["current_liabilities"] > 0,
        (df["current_assets"].fillna(0) - df["inventory"].fillna(0)) / df["current_liabilities"],
        None,
    )
    df["debt_to_equity"] = np.where(df["total_assets"] > 0, df["total_liabilities"] / df["total_assets"] * 100, None)
    
    # 利息保障倍数 = 营业利润 / 财务费用（取绝对值）
    df["interest_coverage"] = np.where(
        df["operating_expense"].fillna(0) != 0,
        df["operating_profit"] / df["operating_expense"].abs(),
        None,
    )
    
    # ===== 运营效率 =====
    df["inventory_turnover"] = np.where(
        df["inventory"] > 0, df["operating_cost"] / df["inventory"], None
    )
    df["receivable_turnover"] = np.where(
        df["accounts_receivable"] > 0, df["revenue"] / df["accounts_receivable"], None
    )
    df["total_asset_turnover"] = np.where(
        df["total_assets"] > 0, df["revenue"] / df["total_assets"], None
    )
    
    # ===== 现金流质量 =====
    df["operating_cashflow_ratio"] = np.where(
        df["revenue"] > 0, df["operating_cashflow"] / df["revenue"], None
    )
    df["free_cashflow_yield"] = np.where(
        df["total_assets"] > 0, df["free_cashflow"] / df["total_assets"] * 100, None
    )
    # 现金转换周期 = 存货周转天数 + 应收周转天数 - 应付周转天数
    inv_days = np.where(df["inventory_turnover"] > 0, 365 / df["inventory_turnover"], 0)
    rec_days = np.where(df["receivable_turnover"] > 0, 365 / df["receivable_turnover"], 0)
    pay_turnover = np.where(df["accounts_payable"] > 0, df["operating_cost"] / df["accounts_payable"], None)
    pay_days = np.where(pay_turnover > 0, 365 / pay_turnover, 0)
    df["cash_conversion_cycle"] = inv_days + rec_days - pay_days
    
    return df


def compute_valuation_metrics(df: pd.DataFrame, market_data: pd.DataFrame) -> pd.DataFrame:
    """
    结合行情数据计算估值指标
    df: 财务数据（含最新一期）
    market_data: 最新行情（含 market_cap, close_price）
    """
    df = df.copy()
    
    # PE = 市值 / 净利润(TTM)
    df["pe_ratio"] = np.where(df["net_profit"] > 0, df["market_cap"] / df["net_profit"], None)
    # PB = 市值 / 净资产
    df["pb_ratio"] = np.where(df["total_equity"] > 0, df["market_cap"] / df["total_equity"], None)
    # PS = 市值 / 营收(TTM)
    df["ps_ratio"] = np.where(df["revenue"] > 0, df["market_cap"] / df["revenue"], None)
    # PCF = 市值 / 经营现金流
    df["pcf_ratio"] = np.where(df["operating_cashflow"] > 0, df["market_cap"] / df["operating_cashflow"], None)
    # PEG
    df["peg_ratio"] = np.where(
        (df["net_profit_growth_yoy"].fillna(0) > 0) & (df["pe_ratio"].notna()),
        df["pe_ratio"] / df["net_profit_growth_yoy"],
        None,
    )
    # EV/EBITDA 简化计算
    ebitda = df["operating_profit"].fillna(0) + df["capex"].fillna(0).abs()  # 粗略近似
    ev = df["market_cap"].fillna(0) + df["debt"].fillna(0) - df["cash_and_equivalents"].fillna(0)
    df["ev_ebitda"] = np.where(ebitda > 0, ev / ebitda, None)
    
    return df
