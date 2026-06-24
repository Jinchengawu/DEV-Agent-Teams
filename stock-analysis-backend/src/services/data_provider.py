import asyncio
import json
from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Optional

import httpx
from src.config import settings
from src.models.financial import StatementType, Period


class DataProvider(ABC):
    """Abstract base class for financial data providers."""

    @abstractmethod
    async def get_company_profile(self, ticker: str) -> Optional[dict]:
        """Get company profile data."""
        ...

    @abstractmethod
    async def get_financial_statements(
        self, ticker: str, statement_type: StatementType, period: Period,
    ) -> list[dict]:
        """Get financial statements (income, balance, cash flow)."""
        ...

    @abstractmethod
    async def get_financial_ratios(self, ticker: str) -> list[dict]:
        """Get computed financial ratios history."""
        ...

    @abstractmethod
    async def get_current_price(self, ticker: str) -> Optional[dict]:
        """Get real-time or delayed price data."""
        ...


class YahooFinanceProvider(DataProvider):
    """
    Yahoo Finance data provider using the public API.
    Note: In production, consider using a more reliable provider or caching layer.
    """

    BASE_URL = "https://query1.finance.yahoo.com"

    async def _request(self, endpoint: str, params: dict = None) -> Optional[dict]:
        url = f"{self.BASE_URL}{endpoint}"
        headers = {"User-Agent": "FundamentalsAI/1.0"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, params=params, headers=headers)
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception:
            return None

    async def get_company_profile(self, ticker: str) -> Optional[dict]:
        """Get company profile from Yahoo Finance."""
        data = await self._request(f"/v10/finance/quoteSummary/{ticker}", {
            "modules": "assetProfile,price,defaultKeyStatistics,summaryDetail"
        })
        if not data:
            return None

        try:
            result = data["quoteSummary"]["result"][0]
            profile = result.get("assetProfile", {})
            price = result.get("price", {})
            stats = result.get("defaultKeyStatistics", {})
            summary = result.get("summaryDetail", {})

            return {
                "ticker": ticker.upper(),
                "name": price.get("shortName", ""),
                "exchange": price.get("exchangeName", ""),
                "market": "US",
                "sector": profile.get("sector"),
                "industry": profile.get("industry"),
                "description": profile.get("longBusinessSummary"),
                "website": profile.get("website"),
                "employees": profile.get("fullTimeEmployees"),
                "current_price": price["regularMarketPrice"].get("raw") if "regularMarketPrice" in price else None,
                "market_cap": price["marketCap"].get("raw") if "marketCap" in price else None,
                "volume": price["regularMarketVolume"].get("raw") if "regularMarketVolume" in price else None,
                "avg_volume": price["averageDailyVolume3Month"].get("raw") if "averageDailyVolume3Month" in price else None,
                "day_high": price["regularMarketDayHigh"].get("raw") if "regularMarketDayHigh" in price else None,
                "day_low": price["regularMarketDayLow"].get("raw") if "regularMarketDayLow" in price else None,
                "week52_high": summary.get("fiftyTwoWeekHigh", {}).get("raw"),
                "week52_low": summary.get("fiftyTwoWeekLow", {}).get("raw"),
                "dividend_yield": summary.get("dividendYield", {}).get("raw"),
                "pe_ttm": summary.get("trailingPE", {}).get("raw"),
                "pb": price.get("priceToBook", {}).get("raw") if "priceToBook" in price else None,
                "roe": stats.get("returnOnEquity", {}).get("raw") if stats else None,
            }
        except (KeyError, IndexError, TypeError):
            return None

    async def get_financial_statements(
        self, ticker: str, statement_type: StatementType, period: Period,
    ) -> list[dict]:
        """Simulated financial statement data. Replace with real API in production."""
        # Yahoo Finance v8 API requires cookie/crumb auth - using simulated data for MVP
        # In production, use Alpha Vantage, Financial Modeling Prep, or SEC EDGAR
        return []

    async def get_financial_ratios(self, ticker: str) -> list[dict]:
        """Get financial ratios from Yahoo Finance statistics."""
        data = await self._request(f"/v10/finance/quoteSummary/{ticker}", {
            "modules": "defaultKeyStatistics,financialData"
        })
        if not data:
            return []

        try:
            result = data["quoteSummary"]["result"][0]
            stats = result.get("defaultKeyStatistics", {})
            fin_data = result.get("financialData", {})

            # Build ratio overview
            return [{
                "date": date.today().isoformat(),
                "profitability": {
                    "roe": _safe_raw(stats, "returnOnEquity"),
                    "roa": _safe_raw(stats, "returnOnAssets"),
                    "gross_margin": _safe_raw(fin_data, "grossMargins"),
                    "net_margin": _safe_raw(fin_data, "profitMargins"),
                    "operating_margin": _safe_raw(fin_data, "operatingMargins"),
                },
                "growth": {
                    "revenue_growth": _safe_raw(fin_data, "revenueGrowth"),
                    "earnings_growth": _safe_raw(fin_data, "earningsGrowth"),
                    "eps_growth": _safe_raw(stats, "earningsQuarterlyGrowth"),
                },
                "solvency": {
                    "debt_to_equity": _safe_raw(fin_data, "debtToEquity"),
                    "current_ratio": _safe_raw(fin_data, "currentRatio"),
                    "quick_ratio": _safe_raw(fin_data, "quickRatio"),
                },
                "efficiency": {
                    "asset_turnover": _safe_raw(stats, "assetTurnover"),
                },
                "valuation": {
                    "pe": _safe_raw(stats, "trailingPE"),
                    "pb": _safe_raw(stats, "priceToBook"),
                    "ps": _safe_raw(stats, "priceToSales"),
                    "peg": _safe_raw(stats, "pegRatio"),
                    "enterprise_value": _safe_raw(stats, "enterpriseValue"),
                    "ev_ebitda": _safe_raw(stats, "enterpriseToEbitda"),
                },
            }]
        except (KeyError, IndexError):
            return []

    async def get_current_price(self, ticker: str) -> Optional[dict]:
        profile = await self.get_company_profile(ticker)
        if not profile:
            return None
        return {
            "ticker": ticker.upper(),
            "price": profile.get("current_price"),
            "change_percent": None,  # Would need separate API call for real data
            "volume": profile.get("volume"),
            "last_updated": datetime.utcnow().isoformat(),
        }


class AlphaVantageProvider(DataProvider):
    """Alpha Vantage data provider (requires API key)."""

    BASE_URL = "https://www.alphavantage.co/query"

    async def _request(self, params: dict) -> Optional[dict]:
        params["apikey"] = settings.alpha_vantage_api_key
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(self.BASE_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if "Error Message" in data or "Note" in data:
                        return None
                    return data
                return None
        except Exception:
            return None

    async def get_company_profile(self, ticker: str) -> Optional[dict]:
        data = await self._request({"function": "OVERVIEW", "symbol": ticker})
        if not data:
            return None

        return {
            "ticker": ticker.upper(),
            "name": data.get("Name"),
            "exchange": data.get("Exchange"),
            "market": "US",
            "sector": data.get("Sector"),
            "industry": data.get("Industry"),
            "description": data.get("Description"),
            "website": None,
            "employees": int(data["FullTimeEmployees"]) if data.get("FullTimeEmployees") else None,
            "current_price": None,
            "market_cap": float(data["MarketCapitalization"]) if data.get("MarketCapitalization") else None,
            "pe_ttm": float(data["TrailingPE"]) if data.get("TrailingPE") else None,
            "pb": float(data["PriceToBookRatio"]) if data.get("PriceToBookRatio") else None,
            "roe": float(data["ReturnOnEquityTTM"]) if data.get("ReturnOnEquityTTM") else None,
            "dividend_yield": float(data["DividendYield"]) if data.get("DividendYield") else None,
            "revenue_growth": float(data["QuarterlyRevenueGrowthYOY"]) if data.get("QuarterlyRevenueGrowthYOY") else None,
            "earnings_growth": float(data["QuarterlyEarningsGrowthYOY"]) if data.get("QuarterlyEarningsGrowthYOY") else None,
            "debt_to_equity": float(data["DebtToEquityRatio"]) if data.get("DebtToEquityRatio") else None,
            "current_ratio": float(data["CurrentRatio"]) if data.get("CurrentRatio") else None,
            "gross_margin": float(data["GrossProfitTTM"]) / float(data["RevenueTTM"]) if data.get("GrossProfitTTM") and data.get("RevenueTTM") else None,
        }

    async def get_financial_statements(
        self, ticker: str, statement_type: StatementType, period: Period,
    ) -> list[dict]:
        function_map = {
            (StatementType.INCOME, Period.ANNUAL): "INCOME_STATEMENT",
            (StatementType.BALANCE_SHEET, Period.ANNUAL): "BALANCE_SHEET",
            (StatementType.CASH_FLOW, Period.ANNUAL): "CASH_FLOW",
            (StatementType.INCOME, Period.QUARTERLY): "INCOME_STATEMENT",
            (StatementType.BALANCE_SHEET, Period.QUARTERLY): "BALANCE_SHEET",
            (StatementType.CASH_FLOW, Period.QUARTERLY): "CASH_FLOW",
        }

        function_name = function_map.get((statement_type, period), "INCOME_STATEMENT")
        data = await self._request({"function": function_name, "symbol": ticker})
        if not data:
            return []

        # Alpha Vantage returns data under different keys
        report_key = "annualReports" if period == Period.ANNUAL else "quarterlyReports"
        reports = data.get(report_key, [])

        results = []
        for report in reports:
            results.append({
                "fiscal_year": int(report["fiscalDateEnding"][:4]),
                "fiscal_quarter": _extract_quarter(report["fiscalDateEnding"]) if period == Period.QUARTERLY else None,
                "report_date": report["fiscalDateEnding"],
                "currency": report.get("reportedCurrency", "USD"),
                "items": {k: _parse_float(v) for k, v in report.items() if k not in ("fiscalDateEnding", "reportedCurrency")},
            })
        return results

    async def get_financial_ratios(self, ticker: str) -> list[dict]:
        # Alpha Vantage OVERVIEW provides most ratios - return as single datapoint
        profile = await self.get_company_profile(ticker)
        if not profile:
            return []

        return [{
            "date": date.today().isoformat(),
            "profitability": {
                "roe": profile.get("roe"),
                "gross_margin": profile.get("gross_margin"),
            },
            "growth": {
                "revenue_growth": profile.get("revenue_growth"),
                "earnings_growth": profile.get("earnings_growth"),
            },
            "solvency": {
                "debt_to_equity": profile.get("debt_to_equity"),
                "current_ratio": profile.get("current_ratio"),
            },
            "efficiency": {},
            "valuation": {
                "pe": profile.get("pe_ttm"),
                "pb": profile.get("pb"),
            },
        }]

    async def get_current_price(self, ticker: str) -> Optional[dict]:
        return None


def get_data_provider(provider_name: str = "yahoo") -> DataProvider:
    """Factory function to get the configured data provider."""
    if provider_name == "alpha_vantage":
        return AlphaVantageProvider()
    return YahooFinanceProvider()


# --- Helper functions ---

def _safe_raw(data: dict, key: str) -> Optional[float]:
    """Safely extract raw value from Yahoo Finance nested dict."""
    if not data:
        return None
    item = data.get(key)
    if isinstance(item, dict):
        return item.get("raw")
    return None


def _parse_float(value) -> Optional[float]:
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _extract_quarter(date_str: str) -> int:
    """Extract quarter (1-4) from a date string."""
    try:
        month = int(date_str[5:7])
        return (month - 1) // 3 + 1
    except (IndexError, ValueError):
        return 1
