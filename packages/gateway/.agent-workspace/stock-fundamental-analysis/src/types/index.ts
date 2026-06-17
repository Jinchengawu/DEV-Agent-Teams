// ==========================================
// 股票基本面深度尽调分析系统 - 核心类型定义
// ==========================================

/** 股票基本信息 */
export interface Stock {
  code: string;          // 股票代码，如 "600519"
  name: string;          // 股票名称，如 "贵州茅台"
  market: 'SH' | 'SZ' | 'BJ'; // 交易所
  industry: string;      // 所属行业
  sector: string;        // 所属板块
  listDate: string;      // 上市日期
  totalShares: number;   // 总股本（万股）
  floatShares: number;   // 流通股本（万股）
}

/** 股票实时行情 */
export interface StockQuote {
  code: string;
  name: string;
  price: number;         // 当前价格
  change: number;        // 涨跌额
  changePercent: number; // 涨跌幅 (%)
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;        // 成交量（手）
  turnover: number;      // 成交额（万元）
  pe: number;            // 市盈率 (TTM)
  pb: number;            // 市净率
  marketCap: number;     // 总市值（亿元）
  floatMarketCap: number; // 流通市值（亿元）
  timestamp: string;
}

/** 利润表 */
export interface IncomeStatement {
  reportDate: string;           // 报告期
  revenue: number;              // 营业总收入（万元）
  operatingCost: number;        // 营业总成本
  grossProfit: number;          // 毛利润
  operatingProfit: number;      // 营业利润
  totalProfit: number;          // 利润总额
  netProfit: number;            // 净利润
  netProfitExcluding: number;   // 扣非净利润
  eps: number;                  // 每股收益
  operatingRevenue: number;     // 营业收入
  researchExpense: number;      // 研发费用
  sellingExpense: number;       // 销售费用
  adminExpense: number;         // 管理费用
  financeExpense: number;       // 财务费用
}

/** 资产负债表 */
export interface BalanceSheet {
  reportDate: string;
  totalAssets: number;          // 总资产
  totalLiabilities: number;     // 总负债
  totalEquity: number;          // 股东权益合计
  currentAssets: number;        // 流动资产
  nonCurrentAssets: number;     // 非流动资产
  currentLiabilities: number;   // 流动负债
  nonCurrentLiabilities: number; // 非流动负债
  cash: number;                 // 货币资金
  inventory: number;            // 存货
  receivables: number;          // 应收账款
  payables: number;             // 应付账款
  fixedAssets: number;          // 固定资产
  intangibleAssets: number;     // 无形资产
  goodwill: number;             // 商誉
  retainedEarnings: number;     // 未分配利润
  bookValuePerShare: number;    // 每股净资产
}

/** 现金流量表 */
export interface CashFlowStatement {
  reportDate: string;
  operatingCashFlow: number;    // 经营活动现金流净额
  investingCashFlow: number;    // 投资活动现金流净额
  financingCashFlow: number;    // 筹资活动现金流净额
  cashFromOperating: number;    // 经营活动现金流入
  cashToOperating: number;      // 经营活动现金流出
  cashFromInvesting: number;
  cashToInvesting: number;
  cashFromFinancing: number;
  cashToFinancing: number;
  capex: number;                // 资本支出
  freeCashFlow: number;         // 自由现金流
  netCashChange: number;        // 现金净增加额
  endCashBalance: number;       // 期末现金余额
}

/** 关键财务指标 */
export interface KeyRatios {
  reportDate: string;
  // 盈利能力
  grossMargin: number;          // 毛利率 (%)
  netMargin: number;            // 净利率 (%)
  roe: number;                  // ROE 净资产收益率 (%)
  roa: number;                  // ROA 总资产收益率 (%)
  roic: number;                 // ROIC 投入资本回报率 (%)
  // 成长能力
  revenueGrowth: number;        // 营收增长率 (%)
  netProfitGrowth: number;      // 净利润增长率 (%)
  epsGrowth: number;            // EPS 增长率 (%)
  // 偿债能力
  currentRatio: number;         // 流动比率
  quickRatio: number;           // 速动比率
  debtToEquity: number;         // 资产负债率 (%)
  interestCoverage: number;     // 利息保障倍数
  // 运营能力
  inventoryTurnover: number;    // 存货周转率
  receivableTurnover: number;   // 应收账款周转率
  totalAssetTurnover: number;   // 总资产周转率
  // 估值指标
  pe: number;                   // 市盈率
  pb: number;                   // 市净率
  ps: number;                   // 市销率
  peg: number;                  // PEG
  dividendYield: number;        // 股息率 (%)
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

/** 尽调报告 */
export interface DueDiligenceReport {
  id: string;
  stockCode: string;
  stockName: string;
  createdAt: string;
  summary: string;
  sections: ReportSection[];
  riskFactors: RiskFactor[];
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
