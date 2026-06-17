/**
 * API 服务层 — 当前使用 Mock，后续切换为 Axios 实例
 */
import type {
  Stock, StockQuote, FinancialData, DueDiligenceReport,
  ComparisonData, StockFilter, ApiResponse,
} from '../types';
import {
  MOCK_STOCKS, MOCK_QUOTES, MOCK_FINANCIAL_DATA,
  MOCK_REPORT, MOCK_COMPARISON,
} from './mockData';

// 模拟网络延迟
const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// TODO: 后续替换为真实 Axios 实例
// const http = axios.create({ baseURL: '/api/v1', timeout: 10000 });

/** 搜索股票列表 */
export async function searchStocks(filter: StockFilter = {}): Promise<ApiResponse<Stock[]>> {
  await delay();
  let results = [...MOCK_STOCKS];
  if (filter.keyword) {
    const kw = filter.keyword.toLowerCase();
    results = results.filter(
      s => s.code.includes(kw) || s.name.toLowerCase().includes(kw) || s.industry.includes(kw)
    );
  }
  if (filter.industry) results = results.filter(s => s.industry === filter.industry);
  if (filter.market) results = results.filter(s => s.market === filter.market);
  return { code: 200, message: 'success', data: results, timestamp: new Date().toISOString() };
}

/** 获取股票实时行情 */
export async function getStockQuote(code: string): Promise<ApiResponse<StockQuote>> {
  await delay(200);
  const quote = MOCK_QUOTES.find(q => q.code === code);
  if (!quote) return { code: 404, message: 'Stock not found', data: null!, timestamp: '' };
  return { code: 200, message: 'success', data: { ...quote, timestamp: new Date().toISOString() }, timestamp: '' };
}

/** 批量获取行情 */
export async function getBatchQuotes(codes: string[]): Promise<ApiResponse<StockQuote[]>> {
  await delay(300);
  const data = MOCK_QUOTES.filter(q => codes.includes(q.code));
  return { code: 200, message: 'success', data, timestamp: new Date().toISOString() };
}

/** 获取财务数据（三表 + 指标） */
export async function getFinancialData(code: string): Promise<ApiResponse<FinancialData>> {
  await delay(500);
  const data = MOCK_FINANCIAL_DATA[code];
  if (!data) return { code: 404, message: 'Financial data not found', data: null!, timestamp: '' };
  return { code: 200, message: 'success', data, timestamp: new Date().toISOString() };
}

/** 获取尽调报告 */
export async function getDueDiligenceReport(code: string): Promise<ApiResponse<DueDiligenceReport>> {
  await delay(800);
  const report = { ...MOCK_REPORT, stockCode: code, stockName: MOCK_STOCKS.find(s => s.code === code)?.name || code };
  return { code: 200, message: 'success', data: report, timestamp: new Date().toISOString() };
}

/** 获取对比数据 */
export async function getComparisonData(codes: string[]): Promise<ApiResponse<ComparisonData>> {
  await delay(400);
  const stocks = MOCK_QUOTES.filter(q => codes.includes(q.code));
  const data: ComparisonData = {
    stocks,
    metrics: MOCK_COMPARISON.metrics.map(m => ({
      ...m,
      values: codes.map((_, i) => m.values[i % m.values.length]),
    })),
  };
  return { code: 200, message: 'success', data, timestamp: new Date().toISOString() };
}

/** 获取热门/推荐股票 */
export async function getHotStocks(): Promise<ApiResponse<StockQuote[]>> {
  await delay(200);
  return { code: 200, message: 'success', data: MOCK_QUOTES.slice(0, 6), timestamp: new Date().toISOString() };
}

/** 获取行业列表 */
export async function getIndustries(): Promise<ApiResponse<string[]>> {
  await delay(100);
  const industries = [...new Set(MOCK_STOCKS.map(s => s.industry))];
  return { code: 200, message: 'success', data: industries, timestamp: new Date().toISOString() };
}
