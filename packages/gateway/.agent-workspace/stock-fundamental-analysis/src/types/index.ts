// ==========================================
// 股票基本面深度尽调分析系统 - 核心类型定义
// ==========================================

/** 股票基本信息 */
export interface Stock {
  code: string;
  name: string;
  market: 'SH' | 'SZ' | 'BJ';
  industry: string;
  sector: string;
  listDate: string;
  totalShares: number;
  floatShares: number;
}

/** 股票实时行情 */
export interface StockQuote {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  turnover: number;
  pe: number;
  pb: number;
  marketCap: number;
  floatMarketCap: number;
  timestamp: string;
}

/** 利润表 */
export interface IncomeStatement {
  reportDate: string;
  revenue: number;
  operatingCost: number;
  grossProfit: number;
  operatingProfit: number;
  totalProfit: number;
  netProfit: number;
  netProfitExcluding: number;
  eps: number;
  operatingRevenue: number;
  researchExpense: number;
  sellingExpense: number;
  adminExpense: number;
  financeExpense: number;
}

/** 资产负债表 */
export interface BalanceSheet {
  reportDate: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  currentAssets: number;
  nonCurrentAssets: number;
  currentLiabilities: number;
  nonCurrentLiabilities: number;
  cash: number;
  inventory: number;
  receivables: number;
  payables: number;
  fixedAssets: number;
  intangibleAssets: number;
  goodwill: number;
  retainedEarnings: number;
  bookValuePerShare: number;
}

/** 现金流量表 */
export interface CashFlowStatement {
  reportDate: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  cashFromOperating: number;
  cashToOperating: number;
  cashFromInvesting: number;
  cashToInvesting: number;
  cashFromFinancing: number;
  cashToFinancing: number;
  capex: number;
  freeCashFlow: number;
  netCashChange: number;
  endCashBalance: number;
}

/** 关键财务指标 */
export interface KeyRatios {
  reportDate: string;
  grossMargin: number;
  netMargin: number;
  roe: number;
  roa: number;
  roic: number;
  revenueGrowth: number;
  netProfitGrowth: number;
  epsGrowth: number;
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  interestCoverage: number;
  inventoryTurnover: number;
  receivableTurnover: number;
  totalAssetTurnover: number;
  pe: number;
  pb: number;
  ps: number;
  peg: number;
  dividendYield: number;
}

/** 三表数据合并 */
export interface FinancialData {
  stockCode: string;
  stockName: string;
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlowStatements: CashFlowStatement[];
  keyRatios: KeyRatios[];
}

// ==========================================
// MVP P0: 异常信号检测
// ==========================================

export type SignalLevel = 'red' | 'yellow' | 'green';

export interface AnomalySignal {
  id: string;
  name: string;
  description: string;
  level: SignalLevel;
  detail: string;
  currentValue: string;
  threshold: string;
  category: '收益质量' | '偿债风险' | '治理风险' | '舞弊信号';
}

/** 异常信号面板汇总 */
export interface AnomalyPanel {
  stockCode: string;
  stockName: string;
  signals: AnomalySignal[];
  summary: string;
  verdict: '🟢可深研' | '🟡有疑点' | '🔴建议规避';
  score: number; // 0-100, lower is better
}

// ==========================================
// MVP P0: 风险评估 (四象限)
// ==========================================

export interface RiskDimension {
  name: string;
  score: number; // 0-100
  label: string; // 低风险/中风险/高风险
  items: RiskItem[];
}

export interface RiskItem {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  currentValue: string;
  threshold: string;
  description: string;
}

export interface RiskAssessment {
  stockCode: string;
  stockName: string;
  totalScore: number;
  totalLabel: string;
  dimensions: RiskDimension[];
  beneishMScore: number;
  beneishConclusion: string;
  altmanZScore: number;
  altmanConclusion: string;
}

// ==========================================
// MVP P0: PE/PB 历史分位 & DCF
// ==========================================

export interface PEHistoryPoint {
  date: string;
  pe: number;
  price: number;
}

export interface PEHistoryBand {
  stockCode: string;
  stockName: string;
  currentPE: number;
  percentile: number;
  minPE: number;
  maxPE: number;
  medianPE: number;
  history: PEHistoryPoint[];
  peers: { name: string; pe: number; pb: number; roe: number }[];
}

export interface DCFParams {
  revenueCAGR: number;    // 阶段1营收CAGR
  netMargin: number;      // 净利率
  capexRate: number;      // CapEx/营收
  wcChangeRate: number;   // 营运资本变动率
  terminalGrowth: number; // 永续增长率
  wacc: number;           // WACC
  stage1Years: number;    // 阶段1年数
}

export interface DCFResult {
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  perShareValue: number;
  currentPrice: number;
  safetyMargin: number;
  cashFlows: { year: number; revenue: number; fcf: number; discountedFCF: number; cumulativePV: number }[];
  terminalValue: number;
  sensitivity: { wacc: number; growth: number; value: number }[][];
}

// ==========================================
// 尽调报告
// ==========================================

export interface DueDiligenceReport {
  id: string;
  stockCode: string;
  stockName: string;
  createdAt: string;
  summary: string;
  verdict: string;
  sections: ReportSection[];
  riskFactors: RiskFactor[];
  highlights: string[];
  warnings: string[];
  conclusion: string;
  rating: '强烈推荐' | '推荐' | '中性' | '谨慎' | '回避';
}

export interface ReportSection {
  title: string;
  content: string;
  metrics: { label: string; value: string; trend: 'up' | 'down' | 'stable' }[];
}

export interface RiskFactor {
  level: 'high' | 'medium' | 'low';
  category: string;
  description: string;
}

/** 股票对比数据 */
export interface ComparisonData {
  stocks: StockQuote[];
  metrics: {
    label: string;
    values: number[];
    unit: string;
    higherIsBetter: boolean;
  }[];
}

/** 通用API响应 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

/** 分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

/** 搜索/筛选参数 */
export interface StockFilter {
  keyword?: string;
  industry?: string;
  market?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPE?: number;
  maxPE?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
