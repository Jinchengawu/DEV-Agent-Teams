/**
 * 自定义 Hooks — 基于 TanStack Query 封装数据请求
 */
import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';
import type { StockFilter } from '../types';

/** 搜索股票 */
export function useStockSearch(filter: StockFilter) {
  return useQuery({
    queryKey: ['stocks', 'search', filter],
    queryFn: () => api.searchStocks(filter),
    select: res => res.data,
    staleTime: 60_000,
  });
}

/** 获取单只股票行情 */
export function useStockQuote(code: string | undefined) {
  return useQuery({
    queryKey: ['stock', 'quote', code],
    queryFn: () => api.getStockQuote(code!),
    select: res => res.data,
    enabled: !!code,
    refetchInterval: 30_000, // 30秒刷新
  });
}

/** 批量行情 */
export function useBatchQuotes(codes: string[]) {
  return useQuery({
    queryKey: ['stocks', 'quotes', codes],
    queryFn: () => api.getBatchQuotes(codes),
    select: res => res.data,
    enabled: codes.length > 0,
    refetchInterval: 30_000,
  });
}

/** 获取财务数据 */
export function useFinancialData(code: string | undefined) {
  return useQuery({
    queryKey: ['stock', 'financial', code],
    queryFn: () => api.getFinancialData(code!),
    select: res => res.data,
    enabled: !!code,
    staleTime: 5 * 60_000,
  });
}

/** 获取尽调报告 */
export function useDueDiligenceReport(code: string | undefined) {
  return useQuery({
    queryKey: ['stock', 'report', code],
    queryFn: () => api.getDueDiligenceReport(code!),
    select: res => res.data,
    enabled: !!code,
  });
}

/** 获取对比数据 */
export function useComparisonData(codes: string[]) {
  return useQuery({
    queryKey: ['stocks', 'comparison', codes],
    queryFn: () => api.getComparisonData(codes),
    select: res => res.data,
    enabled: codes.length >= 2,
  });
}

/** 热门股票 */
export function useHotStocks() {
  return useQuery({
    queryKey: ['stocks', 'hot'],
    queryFn: () => api.getHotStocks(),
    select: res => res.data,
    staleTime: 5 * 60_000,
  });
}

/** 行业列表 */
export function useIndustries() {
  return useQuery({
    queryKey: ['meta', 'industries'],
    queryFn: () => api.getIndustries(),
    select: res => res.data,
    staleTime: 30 * 60_000,
  });
}
