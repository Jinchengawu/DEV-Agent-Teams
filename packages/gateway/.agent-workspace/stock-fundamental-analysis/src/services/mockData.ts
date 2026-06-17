/**
 * Mock 数据 — 开发阶段使用，后续替换为真实API
 */
import type {
  Stock, StockQuote, FinancialData, IncomeStatement,
  BalanceSheet, CashFlowStatement, KeyRatios, DueDiligenceReport,
  ComparisonData,
} from '../types';

// ---------- 股票列表 ----------
export const MOCK_STOCKS: Stock[] = [
  { code: '600519', name: '贵州茅台', market: 'SH', industry: '白酒', sector: '食品饮料', listDate: '2001-08-27', totalShares: 125620, floatShares: 125620 },
  { code: '000858', name: '五粮液', market: 'SZ', industry: '白酒', sector: '食品饮料', listDate: '1998-04-27', totalShares: 388219, floatShares: 388167 },
  { code: '601318', name: '中国平安', market: 'SH', industry: '保险', sector: '金融', listDate: '2007-03-01', totalShares: 1828024, floatShares: 1828024 },
  { code: '000333', name: '美的集团', market: 'SZ', industry: '白色家电', sector: '家用电器', listDate: '2013-09-18', totalShares: 693178, floatShares: 678854 },
  { code: '002594', name: '比亚迪', market: 'SZ', industry: '新能源汽车', sector: '汽车', listDate: '2011-06-30', totalShares: 291137, floatShares: 234289 },
  { code: '600036', name: '招商银行', market: 'SH', industry: '银行', sector: '金融', listDate: '2002-04-09', totalShares: 2521984, floatShares: 2065388 },
  { code: '300750', name: '宁德时代', market: 'SZ', industry: '电池', sector: '新能源', listDate: '2018-06-11', totalShares: 233078, floatShares: 204550 },
  { code: '603259', name: '药明康德', market: 'SH', industry: 'CXO', sector: '医药生物', listDate: '2018-05-08', totalShares: 296893, floatShares: 266819 },
  { code: '000001', name: '平安银行', market: 'SZ', industry: '银行', sector: '金融', listDate: '1991-04-03', totalShares: 1940591, floatShares: 1940555 },
  { code: '600900', name: '长江电力', market: 'SH', industry: '水电', sector: '公用事业', listDate: '2003-11-18', totalShares: 2452370, floatShares: 2452370 },
];

// ---------- 行情数据 ----------
const quoteTemplates: Omit<StockQuote, 'code' | 'name' | 'timestamp'>[] = [
  { price: 1688.00, change: 23.50, changePercent: 1.41, open: 1665.00, high: 1695.80, low: 1658.30, prevClose: 1664.50, volume: 28934, turnover: 485672, pe: 28.5, pb: 9.8, marketCap: 21215, floatMarketCap: 21215 },
  { price: 152.30, change: -2.10, changePercent: -1.36, open: 154.80, high: 155.20, low: 151.50, prevClose: 154.40, volume: 156782, turnover: 239018, pe: 21.3, pb: 5.2, marketCap: 5913, floatMarketCap: 5912 },
  { price: 48.65, change: 0.85, changePercent: 1.78, open: 47.90, high: 49.10, low: 47.50, prevClose: 47.80, volume: 892341, turnover: 434567, pe: 8.2, pb: 1.1, marketCap: 8893, floatMarketCap: 8893 },
  { price: 62.10, change: 1.30, changePercent: 2.14, open: 60.90, high: 62.50, low: 60.50, prevClose: 60.80, volume: 445623, turnover: 275892, pe: 12.8, pb: 3.5, marketCap: 4304, floatMarketCap: 4220 },
  { price: 258.80, change: -5.60, changePercent: -2.12, open: 264.50, high: 266.00, low: 256.30, prevClose: 264.40, volume: 567890, turnover: 1472345, pe: 25.6, pb: 6.1, marketCap: 7536, floatMarketCap: 6047 },
  { price: 35.20, change: 0.45, changePercent: 1.30, open: 34.80, high: 35.50, low: 34.60, prevClose: 34.75, volume: 1234567, turnover: 434521, pe: 5.8, pb: 0.9, marketCap: 8877, floatMarketCap: 7275 },
  { price: 192.50, change: 8.30, changePercent: 4.51, open: 185.00, high: 194.80, low: 184.20, prevClose: 184.20, volume: 678234, turnover: 1304567, pe: 22.1, pb: 4.8, marketCap: 4488, floatMarketCap: 3938 },
  { price: 48.90, change: -1.20, changePercent: -2.40, open: 50.20, high: 50.50, low: 48.50, prevClose: 50.10, volume: 345678, turnover: 169234, pe: 18.5, pb: 3.2, marketCap: 1451, floatMarketCap: 1304 },
  { price: 11.85, change: 0.15, changePercent: 1.28, open: 11.72, high: 11.95, low: 11.68, prevClose: 11.70, volume: 2345678, turnover: 278123, pe: 5.1, pb: 0.6, marketCap: 2300, floatMarketCap: 2300 },
  { price: 28.60, change: 0.30, changePercent: 1.06, open: 28.35, high: 28.80, low: 28.20, prevClose: 28.30, volume: 567890, turnover: 162567, pe: 19.2, pb: 3.1, marketCap: 7014, floatMarketCap: 7014 },
];

export const MOCK_QUOTES: StockQuote[] = MOCK_STOCKS.map((stock, i) => ({
  ...quoteTemplates[i],
  code: stock.code,
  name: stock.name,
  timestamp: new Date().toISOString(),
}));

// ---------- 生成历史财务数据 ----------
function generateYears(count: number): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => `${currentYear - i}-12-31`);
}

function generateIncomeStatements(base: Partial<IncomeStatement>): IncomeStatement[] {
  return generateYears(5).map((reportDate, i) => {
    const factor = 1 - i * 0.08 + (Math.random() - 0.5) * 0.05;
    const revenue = (base.revenue || 1000000) * factor;
    const operatingCost = revenue * 0.55;
    const grossProfit = revenue - operatingCost;
    return {
      reportDate,
      revenue: Math.round(revenue),
      operatingCost: Math.round(operatingCost),
      grossProfit: Math.round(grossProfit),
      operatingProfit: Math.round(grossProfit * 0.52),
      totalProfit: Math.round(grossProfit * 0.55),
      netProfit: Math.round(grossProfit * 0.42),
      netProfitExcluding: Math.round(grossProfit * 0.40),
      eps: +(grossProfit * 0.42 / 100000).toFixed(2),
      operatingRevenue: Math.round(revenue),
      researchExpense: Math.round(revenue * 0.03),
      sellingExpense: Math.round(revenue * 0.05),
      adminExpense: Math.round(revenue * 0.04),
      financeExpense: Math.round(revenue * 0.01),
    };
  });
}

function generateBalanceSheets(): BalanceSheet[] {
  return generateYears(5).map((reportDate, i) => {
    const f = 1 - i * 0.05 + (Math.random() - 0.5) * 0.03;
    const totalAssets = 5000000 * f;
    return {
      reportDate,
      totalAssets: Math.round(totalAssets),
      totalLiabilities: Math.round(totalAssets * 0.42),
      totalEquity: Math.round(totalAssets * 0.58),
      currentAssets: Math.round(totalAssets * 0.45),
      nonCurrentAssets: Math.round(totalAssets * 0.55),
      currentLiabilities: Math.round(totalAssets * 0.28),
      nonCurrentLiabilities: Math.round(totalAssets * 0.14),
      cash: Math.round(totalAssets * 0.18),
      inventory: Math.round(totalAssets * 0.08),
      receivables: Math.round(totalAssets * 0.06),
      payables: Math.round(totalAssets * 0.05),
      fixedAssets: Math.round(totalAssets * 0.22),
      intangibleAssets: Math.round(totalAssets * 0.05),
      goodwill: Math.round(totalAssets * 0.02),
      retainedEarnings: Math.round(totalAssets * 0.25),
      bookValuePerShare: +(totalAssets * 0.58 / 1000000).toFixed(2),
    };
  });
}

function generateCashFlows(): CashFlowStatement[] {
  return generateYears(5).map((reportDate, i) => {
    const f = 1 - i * 0.06 + (Math.random() - 0.5) * 0.04;
    const ocf = 800000 * f;
    const icf = -500000 * f;
    const fcf = -200000 * f;
    return {
      reportDate,
      operatingCashFlow: Math.round(ocf),
      investingCashFlow: Math.round(icf),
      financingCashFlow: Math.round(fcf),
      cashFromOperating: Math.round(ocf * 1.5),
      cashToOperating: Math.round(ocf * 0.5),
      cashFromInvesting: Math.round(Math.abs(icf) * 0.3),
      cashToInvesting: Math.round(Math.abs(icf) * 1.3),
      cashFromFinancing: Math.round(Math.abs(fcf) * 0.4),
      cashToFinancing: Math.round(Math.abs(fcf) * 1.4),
      capex: Math.round(Math.abs(icf) * 0.7),
      freeCashFlow: Math.round(ocf - Math.abs(icf) * 0.7),
      netCashChange: Math.round(ocf + icf + fcf),
      endCashBalance: Math.round(1200000 * f),
    };
  });
}

function generateKeyRatios(overrides: Partial<KeyRatios>[] = []): KeyRatios[] {
  return generateYears(5).map((reportDate, i) => {
    const override = overrides[i] || {};
    return {
      reportDate,
      grossMargin: override.grossMargin ?? +(65 - i * 1.2 + Math.random() * 3).toFixed(1),
      netMargin: override.netMargin ?? +(32 - i * 0.8 + Math.random() * 2).toFixed(1),
      roe: override.roe ?? +(28 - i * 1.5 + Math.random() * 3).toFixed(1),
      roa: override.roa ?? +(15 - i * 0.8 + Math.random() * 2).toFixed(1),
      roic: override.roic ?? +(22 - i * 1.0 + Math.random() * 2).toFixed(1),
      revenueGrowth: override.revenueGrowth ?? +(18 - i * 3.5 + Math.random() * 5).toFixed(1),
      netProfitGrowth: override.netProfitGrowth ?? +(20 - i * 4 + Math.random() * 6).toFixed(1),
      epsGrowth: override.epsGrowth ?? +(19 - i * 3.8 + Math.random() * 5).toFixed(1),
      currentRatio: override.currentRatio ?? +(2.1 - i * 0.08 + Math.random() * 0.2).toFixed(2),
      quickRatio: override.quickRatio ?? +(1.8 - i * 0.06 + Math.random() * 0.15).toFixed(2),
      debtToEquity: override.debtToEquity ?? +(38 + i * 1.5 + Math.random() * 3).toFixed(1),
      interestCoverage: override.interestCoverage ?? +(12 - i * 0.8 + Math.random() * 2).toFixed(1),
      inventoryTurnover: override.inventoryTurnover ?? +(4.5 - i * 0.2 + Math.random() * 0.5).toFixed(2),
      receivableTurnover: override.receivableTurnover ?? +(8.2 - i * 0.3 + Math.random() * 0.8).toFixed(2),
      totalAssetTurnover: override.totalAssetTurnover ?? +(0.65 - i * 0.02 + Math.random() * 0.05).toFixed(2),
      pe: override.pe ?? +(30 - i * 1.5 + Math.random() * 5).toFixed(1),
      pb: override.pb ?? +(10 - i * 0.5 + Math.random() * 1).toFixed(1),
      ps: override.ps ?? +(12 - i * 0.6 + Math.random() * 1.5).toFixed(1),
      peg: override.peg ?? +(1.5 - i * 0.1 + Math.random() * 0.3).toFixed(2),
      dividendYield: override.dividendYield ?? +(1.2 + i * 0.15 + Math.random() * 0.3).toFixed(2),
    };
  });
}

// 为不同股票生成差异化数据
export const MOCK_FINANCIAL_DATA: Record<string, FinancialData> = {
  '600519': {
    stockCode: '600519', stockName: '贵州茅台',
    incomeStatements: generateIncomeStatements({ revenue: 15000000 }),
    balanceSheets: generateBalanceSheets(),
    cashFlowStatements: generateCashFlows(),
    keyRatios: generateKeyRatios([
      { grossMargin: 91.5, netMargin: 52.3, roe: 33.2, grossMargin: 91.5, revenueGrowth: 16.5, netProfitGrowth: 19.2 },
      { grossMargin: 91.2, netMargin: 51.8, roe: 31.8, revenueGrowth: 15.2, netProfitGrowth: 17.5 },
      { grossMargin: 90.8, netMargin: 50.5, roe: 30.1, revenueGrowth: 13.8, netProfitGrowth: 15.1 },
      { grossMargin: 90.5, netMargin: 49.2, roe: 28.5, revenueGrowth: 11.5, netProfitGrowth: 12.8 },
      { grossMargin: 90.1, netMargin: 48.1, roe: 27.2, revenueGrowth: 10.2, netProfitGrowth: 11.5 },
    ]),
  },
  '002594': {
    stockCode: '002594', stockName: '比亚迪',
    incomeStatements: generateIncomeStatements({ revenue: 6000000 }),
    balanceSheets: generateBalanceSheets(),
    cashFlowStatements: generateCashFlows(),
    keyRatios: generateKeyRatios([
      { grossMargin: 20.1, netMargin: 4.8, roe: 18.5, revenueGrowth: 42.5, netProfitGrowth: 65.2 },
      { grossMargin: 19.5, netMargin: 4.2, roe: 16.2, revenueGrowth: 38.2, netProfitGrowth: 55.8 },
      { grossMargin: 17.8, netMargin: 3.5, roe: 13.8, revenueGrowth: 32.1, netProfitGrowth: 42.5 },
      { grossMargin: 16.2, netMargin: 2.8, roe: 11.2, revenueGrowth: 25.5, netProfitGrowth: 30.2 },
      { grossMargin: 15.5, netMargin: 2.1, roe: 8.5, revenueGrowth: 18.8, netProfitGrowth: 20.5 },
    ]),
  },
};

// 为其余股票生成默认数据
MOCK_STOCKS.forEach(stock => {
  if (!MOCK_FINANCIAL_DATA[stock.code]) {
    MOCK_FINANCIAL_DATA[stock.code] = {
      stockCode: stock.code,
      stockName: stock.name,
      incomeStatements: generateIncomeStatements({ revenue: 3000000 + Math.random() * 8000000 }),
      balanceSheets: generateBalanceSheets(),
      cashFlowStatements: generateCashFlows(),
      keyRatios: generateKeyRatios(),
    };
  }
});

// ---------- 尽调报告 ----------
export const MOCK_REPORT: DueDiligenceReport = {
  id: 'rpt-001',
  stockCode: '600519',
  stockName: '贵州茅台',
  createdAt: new Date().toISOString(),
  summary: '贵州茅台作为中国白酒行业绝对龙头，拥有深厚的品牌护城河和强大的定价权。公司毛利率常年保持90%以上，ROE维持在28%-33%区间，现金流充沛，基本面极为优质。',
  sections: [
    {
      title: '一、盈利能力分析',
      content: '公司盈利能力在A股市场中名列前茅。毛利率连续5年保持在90%以上，净利率稳定在48%-52%之间，远超同行业平均水平。ROE从27.2%提升至33.2%，展现出强劲的资本回报能力。自由现金流持续为正，经营质量优异。',
      metrics: [
        { label: '毛利率', value: '91.5%', trend: 'up' },
        { label: '净利率', value: '52.3%', trend: 'up' },
        { label: 'ROE', value: '33.2%', trend: 'up' },
        { label: '自由现金流', value: '580亿', trend: 'up' },
      ],
    },
    {
      title: '二、成长性分析',
      content: '近5年营收复合增长率约13.4%，净利润复合增长率约15.2%，保持稳健增长。产品提价能力叠加产能扩张，支撑业绩持续增长。系列酒板块快速发展，成为新增长极。',
      metrics: [
        { label: '营收CAGR', value: '13.4%', trend: 'stable' },
        { label: '净利润CAGR', value: '15.2%', trend: 'up' },
        { label: 'EPS增长率', value: '19.2%', trend: 'up' },
      ],
    },
    {
      title: '三、偿债能力与财务安全',
      content: '资产负债率仅约20%，无有息负债，流动比率超过3倍，财务结构极为稳健。账上现金充裕，利息保障倍数极高，几乎不存在偿债风险。',
      metrics: [
        { label: '资产负债率', value: '20.1%', trend: 'stable' },
        { label: '流动比率', value: '3.25', trend: 'stable' },
        { label: '利息保障倍数', value: 'N/A', trend: 'stable' },
      ],
    },
    {
      title: '四、运营效率分析',
      content: '存货周转率较低属行业特性（酱酒需要5年基酒储备），应收账款极少，体现了强大的渠道议价能力和先款后货的商业模式优势。总资产周转率逐年改善。',
      metrics: [
        { label: '存货周转率', value: '0.35', trend: 'stable' },
        { label: '应收周转率', value: '45.2', trend: 'up' },
        { label: '总资产周转率', value: '0.72', trend: 'up' },
      ],
    },
    {
      title: '五、估值分析',
      content: '当前PE(TTM)约28.5倍，处于近5年估值中枢偏下位置。PB约9.8倍，股息率约1.8%。综合考虑品牌溢价和增长确定性，当前估值合理偏低。',
      metrics: [
        { label: 'PE(TTM)', value: '28.5x', trend: 'down' },
        { label: 'PB', value: '9.8x', trend: 'down' },
        { label: '股息率', value: '1.8%', trend: 'up' },
        { label: 'PEG', value: '1.49', trend: 'stable' },
      ],
    },
  ],
  riskFactors: [
    { level: 'medium', category: '政策风险', description: '白酒消费税改革可能对利润率产生影响，需关注政策动向。' },
    { level: 'low', category: '市场风险', description: '高端白酒消费与宏观经济周期存在一定相关性，经济下行可能影响需求。' },
    { level: 'low', category: '竞争风险', description: '酱酒品类扩容带来竞争加剧，但茅台品牌地位短期难以撼动。' },
    { level: 'medium', category: '估值风险', description: '当前估值虽已回落但仍处于相对高位，业绩不及预期可能导致估值回调。' },
  ],
  conclusion: '贵州茅台具备极强的品牌护城河、优异的盈利能力和稳健的财务结构，是A股市场稀缺的优质核心资产。当前估值处于合理区间，建议长期持有。',
  rating: '推荐',
};

// ---------- 对比数据 ----------
export const MOCK_COMPARISON: ComparisonData = {
  stocks: MOCK_QUOTES.slice(0, 4),
  metrics: [
    { label: '毛利率', values: [91.5, 75.2, 18.5, 25.3], unit: '%', higherIsBetter: true },
    { label: '净利率', values: [52.3, 38.5, 8.2, 9.1], unit: '%', higherIsBetter: true },
    { label: 'ROE', values: [33.2, 25.8, 12.5, 18.3], unit: '%', higherIsBetter: true },
    { label: 'PE(TTM)', values: [28.5, 21.3, 8.2, 12.8], unit: 'x', higherIsBetter: false },
    { label: '营收增长', values: [16.5, 12.3, 8.5, 15.2], unit: '%', higherIsBetter: true },
    { label: '资产负债率', values: [20.1, 35.2, 88.5, 62.3], unit: '%', higherIsBetter: false },
  ],
};
