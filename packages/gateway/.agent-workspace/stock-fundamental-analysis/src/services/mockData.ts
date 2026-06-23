/**
 * Mock 数据 — 开发阶段使用，后续替换为真实API
 */
import type {
  Stock, StockQuote, FinancialData, IncomeStatement,
  BalanceSheet, CashFlowStatement, KeyRatios, DueDiligenceReport,
  ComparisonData, AnomalySignal, AnomalyPanel, RiskAssessment,
  RiskDimension, RiskItem, PEHistoryBand, PEHistoryPoint, DCFResult,
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

// ---------- 异常信号数据 ----------
import type { AnomalyPanel, RiskAssessment, PEHistoryBand, DCFResult } from '../types';

export const MOCK_ANOMALY_PANELS: Record<string, AnomalyPanel> = {
  '600519': {
    stockCode: '600519', stockName: '贵州茅台',
    signals: [
      { id: 's1', name: '收入/现金流背离', description: '收入增长 vs 经营现金流增长是否匹配', level: 'green', detail: '营收增速16.5%，经营现金流增速18.2%，两者方向一致且现金流增速略高于营收，经营质量优秀。', currentValue: '经营现金流/净利润 = 1.12', threshold: '> 0.8 为健康', category: '收益质量' },
      { id: 's2', name: '存货增速 vs 收入增速背离', description: '存货增速显著高于收入增速可能预示滞销', level: 'green', detail: '存货增速8.3% < 营收增速16.5%，存货消化正常，无需担心滞销。', currentValue: '存货增速 8.3%', threshold: '< 营收增速 16.5%', category: '收益质量' },
      { id: 's3', name: '应收账款/收入比异常', description: '应收占比突增可能意味着虚增收入或回款困难', level: 'green', detail: '应收账款/营收比例仅0.3%，几乎为零，先款后货的商业模式极为健康。', currentValue: '应收/营收 = 0.3%', threshold: '< 5% 为健康', category: '收益质量' },
      { id: 's4', name: '毛利率骤降/骤升', description: '毛利率异常波动需关注竞争力和会计政策', level: 'green', detail: '毛利率5年维持在90.1%-91.5%，极为稳定，品牌定价权极强。', currentValue: '91.5%（近5年波动<2%）', threshold: '波动 < 5% 为稳定', category: '收益质量' },
      { id: 's5', name: '非经常性损益占比过高', description: '利润过度依赖一次性收益则质量差', level: 'green', detail: '非经常性损益仅占净利润0.3%，利润几乎全部来自主营业务，质量极高。', currentValue: '非经常/净利润 = 0.3%', threshold: '< 10% 为健康', category: '收益质量' },
      { id: 's6', name: '商誉/净资产比超阈值', description: '商誉过高存在减值暴雷风险', level: 'green', detail: '商誉占比几乎为零，无并购暴雷风险。', currentValue: '商誉/净资产 ≈ 0%', threshold: '< 20% 为安全', category: '治理风险' },
      { id: 's7', name: '研发资本化率异常', description: '过度资本化研发支出可能虚增利润', level: 'green', detail: '研发支出占比极低（0.4%），且基本费用化处理，不存在资本化操纵利润的问题。', currentValue: '研发/营收 = 0.4%', threshold: '< 3% 或全额费用化', category: '收益质量' },
      { id: 's8', name: '关联交易占比突增', description: '关联交易占比过高可能存在利益输送', level: 'green', detail: '关联交易占比12%，在白酒行业属正常水平，且定价公允。', currentValue: '关联交易/营收 = 12%', threshold: '< 20% 为正常', category: '治理风险' },
    ],
    summary: '贵州茅台在8项异常检测中全部亮绿灯，财务质量极其优良。公司具备极强的品牌护城河、议价能力和现金流创造能力。当前主要关注点在于营收增速从高位回落趋势。',
    verdict: '🟢可深研',
    score: 8,
  },
  '002594': {
    stockCode: '002594', stockName: '比亚迪',
    signals: [
      { id: 's1', name: '收入/现金流背离', description: '收入增长 vs 经营现金流增长是否匹配', level: 'yellow', detail: '营收增速42.5%但经营现金流增速仅28.3%，现金流增速落后于营收，需关注回款情况。', currentValue: '经营现金流/净利润 = 1.65', threshold: '> 0.8 为健康', category: '收益质量' },
      { id: 's2', name: '存货增速 vs 收入增速背离', description: '存货增速显著高于收入增速可能预示滞销', level: 'green', detail: '存货增速35.2% < 营收增速42.5%，存货消化正常。', currentValue: '存货增速 35.2%', threshold: '< 营收增速 42.5%', category: '收益质量' },
      { id: 's3', name: '应收账款/收入比异常', description: '应收占比突增可能意味着虚增收入或回款困难', level: 'yellow', detail: '应收账款/营收比例约12.5%，处于制造业中等水平，但需持续关注账龄结构。', currentValue: '应收/营收 = 12.5%', threshold: '< 10% 为优秀', category: '收益质量' },
      { id: 's4', name: '毛利率骤降/骤升', description: '毛利率异常波动需关注竞争力和会计政策', level: 'green', detail: '毛利率从15.5%逐步提升至20.1%，规模效应显现，趋势向好。', currentValue: '20.1%（持续改善中）', threshold: '波动 < 5% 为稳定', category: '收益质量' },
      { id: 's5', name: '非经常性损益占比过高', description: '利润过度依赖一次性收益则质量差', level: 'yellow', detail: '非经常性损益占比约8.5%，主要来自政府补贴（新能源产业政策支持），需关注补贴退坡影响。', currentValue: '非经常/净利润 = 8.5%', threshold: '< 10% 为健康', category: '收益质量' },
      { id: 's6', name: '商誉/净资产比超阈值', description: '商誉过高存在减值暴雷风险', level: 'green', detail: '商誉/净资产约3.2%，风险极低。', currentValue: '商誉/净资产 = 3.2%', threshold: '< 20% 为安全', category: '治理风险' },
      { id: 's7', name: '研发资本化率异常', description: '过度资本化研发支出可能虚增利润', level: 'green', detail: '研发投入占营收5.8%，资本化率约35%，在科技制造行业属合理水平。', currentValue: '研发/营收 = 5.8%，资本化35%', threshold: '资本化 < 50%', category: '收益质量' },
      { id: 's8', name: '关联交易占比突增', description: '关联交易占比过高可能存在利益输送', level: 'green', detail: '关联交易占比约8%，主要为供应链上下游交易，价格公允。', currentValue: '关联交易/营收 = 8%', threshold: '< 20% 为正常', category: '治理风险' },
    ],
    summary: '比亚迪在8项检测中有5绿3黄，整体财务健康但存在一些需关注的信号。经营现金流增速落后于营收增速，政府补贴占比较高需关注行业政策变化。高增长阶段财务特征明显。',
    verdict: '🟡有疑点',
    score: 32,
  },
};

// 为所有股票生成默认异常面板
MOCK_STOCKS.forEach(stock => {
  if (!MOCK_ANOMALY_PANELS[stock.code]) {
    const signals: AnomalySignal[] = [
      { id: 's1', name: '收入/现金流背离', description: '收入增长 vs 经营现金流增长', level: Math.random() > 0.6 ? 'yellow' : 'green', detail: '', currentValue: '', threshold: '', category: '收益质量' },
      { id: 's2', name: '存货增速 vs 收入增速背离', description: '存货异常', level: Math.random() > 0.7 ? 'red' : Math.random() > 0.4 ? 'yellow' : 'green', detail: '', currentValue: '', threshold: '', category: '收益质量' },
      { id: 's3', name: '应收账款/收入比异常', description: '应收异常', level: Math.random() > 0.5 ? 'yellow' : 'green', detail: '', currentValue: '', threshold: '', category: '收益质量' },
      { id: 's4', name: '毛利率骤降/骤升', description: '毛利率异动', level: 'green', detail: '', currentValue: '', threshold: '', category: '收益质量' },
      { id: 's5', name: '非经常性损益占比过高', description: '非经常损益', level: Math.random() > 0.5 ? 'yellow' : 'green', detail: '', currentValue: '', threshold: '', category: '收益质量' },
      { id: 's6', name: '商誉/净资产比超阈值', description: '商誉超标', level: Math.random() > 0.7 ? 'red' : 'green', detail: '', currentValue: '', threshold: '', category: '治理风险' },
      { id: 's7', name: '研发资本化率异常', description: '研发资本化', level: 'green', detail: '', currentValue: '', threshold: '', category: '收益质量' },
      { id: 's8', name: '关联交易占比突增', description: '关联交易', level: Math.random() > 0.6 ? 'yellow' : 'green', detail: '', currentValue: '', threshold: '', category: '治理风险' },
    ];
    const redCount = signals.filter(s => s.level === 'red').length;
    const yellowCount = signals.filter(s => s.level === 'yellow').length;
    MOCK_ANOMALY_PANELS[stock.code] = {
      stockCode: stock.code, stockName: stock.name, signals,
      summary: `共检测到 ${redCount} 项红灯、${yellowCount} 项黄灯。`,
      verdict: redCount > 0 ? '🔴建议规避' : yellowCount > 2 ? '🟡有疑点' : '🟢可深研',
      score: redCount * 20 + yellowCount * 5 + Math.floor(Math.random() * 10),
    };
  }
});

// ---------- 风险评估数据 ----------
export const MOCK_RISK_ASSESSMENTS: Record<string, RiskAssessment> = {
  '600519': {
    stockCode: '600519', stockName: '贵州茅台',
    totalScore: 22, totalLabel: '低风险',
    dimensions: [
      { name: '财务风险', score: 18, label: '低风险',
        items: [
          { name: 'OCF/净利润', status: 'pass', currentValue: '0.89', threshold: '>0.8', description: '经营现金流对利润的覆盖度' },
          { name: '资产负债率', status: 'pass', currentValue: '21.8%', threshold: '<60%', description: '整体杠杆水平' },
          { name: '流动比率', status: 'pass', currentValue: '4.26', threshold: '>1.5', description: '短期偿债能力' },
          { name: '有息负债率', status: 'pass', currentValue: '0%', threshold: '<30%', description: '有息负债风险' },
        ],
      },
      { name: '经营风险', score: 25, label: '低风险',
        items: [
          { name: '客户集中度', status: 'pass', currentValue: '分散', threshold: 'CR5<30%', description: '前5大客户营收占比' },
          { name: '供应商集中度', status: 'pass', currentValue: '分散', threshold: 'SR5<30%', description: '前5大供应商采购占比' },
          { name: '行业竞争烈度', status: 'pass', currentValue: '低', threshold: '', description: '白酒行业格局稳定' },
        ],
      },
      { name: '监管风险', score: 30, label: '中低风险',
        items: [
          { name: '政策敏感性', status: 'warn', currentValue: '白酒消费税', threshold: '', description: '消费税改革可能带来成本上升' },
          { name: '合规记录', status: 'pass', currentValue: '良好', threshold: '', description: '近期无重大违规' },
        ],
      },
      { name: '宏观风险', score: 20, label: '低风险',
        items: [
          { name: '经济周期敏感度', status: 'pass', currentValue: '低', threshold: '', description: '高端白酒需求刚性较强' },
          { name: '汇率敞口', status: 'pass', currentValue: '几乎为零', threshold: '', description: '以内销为主' },
        ],
      },
    ],
    beneishMScore: -2.85, beneishConclusion: '低舞弊概率 ✅',
    altmanZScore: 8.5, altmanConclusion: '安全区 ✅',
  },
  '002594': {
    stockCode: '002594', stockName: '比亚迪',
    totalScore: 48, totalLabel: '中风险',
    dimensions: [
      { name: '财务风险', score: 45, label: '中风险',
        items: [
          { name: 'OCF/净利润', status: 'pass', currentValue: '1.65', threshold: '>0.8', description: '经营现金流质量' },
          { name: '资产负债率', status: 'warn', currentValue: '68.5%', threshold: '<60%', description: '整体杠杆水平偏高' },
          { name: '流动比率', status: 'warn', currentValue: '1.15', threshold: '>1.5', description: '短期偿债压力' },
        ],
      },
      { name: '经营风险', score: 50, label: '中风险',
        items: [
          { name: '客户集中度', status: 'pass', currentValue: '中等', threshold: '', description: '客户分布合理' },
          { name: '行业竞争烈度', status: 'warn', currentValue: '高', threshold: '', description: '新能源汽车竞争白热化' },
        ],
      },
      { name: '监管风险', score: 42, label: '中风险',
        items: [
          { name: '政策依赖性', status: 'warn', currentValue: '新能源补贴', threshold: '', description: '补贴退坡影响盈利' },
          { name: '合规记录', status: 'pass', currentValue: '良好', threshold: '', description: '' },
        ],
      },
      { name: '宏观风险', score: 55, label: '中风险',
        items: [
          { name: '经济周期敏感度', status: 'warn', currentValue: '中高', threshold: '', description: '汽车消费受经济影响大' },
          { name: '汇率敞口', status: 'pass', currentValue: '中等', threshold: '', description: '海外业务占比提升' },
        ],
      },
    ],
    beneishMScore: -1.52, beneishConclusion: '灰色区间 ⚠️',
    altmanZScore: 3.2, altmanConclusion: '安全区 ✅',
  },
};

// 默认风险评估
MOCK_STOCKS.forEach(stock => {
  if (!MOCK_RISK_ASSESSMENTS[stock.code]) {
    const dims: RiskDimension[] = [
      { name: '财务风险', score: 25 + Math.random() * 50, label: Math.random() > 0.5 ? '中风险' : '低风险', items: [] },
      { name: '经营风险', score: 20 + Math.random() * 55, label: Math.random() > 0.5 ? '中风险' : '低风险', items: [] },
      { name: '监管风险', score: 15 + Math.random() * 40, label: '低风险', items: [] },
      { name: '宏观风险', score: 20 + Math.random() * 45, label: Math.random() > 0.5 ? '中风险' : '低风险', items: [] },
    ];
    MOCK_RISK_ASSESSMENTS[stock.code] = {
      stockCode: stock.code, stockName: stock.name,
      totalScore: Math.round(dims.reduce((a, d) => a + d.score, 0) / 4),
      totalLabel: dims.reduce((a, d) => a + d.score, 0) / 4 > 50 ? '中风险' : '低风险',
      dimensions: dims, beneishMScore: -2.0 + Math.random() * 1.5,
      beneishConclusion: Math.random() > 0.5 ? '低舞弊概率 ✅' : '灰色区间 ⚠️',
      altmanZScore: 2 + Math.random() * 6,
      altmanConclusion: Math.random() > 0.5 ? '安全区 ✅' : '灰色区',
    };
  }
});

// ---------- PE历史分位数据 ----------
export function generatePEHistory(code: string): PEHistoryBand {
  const quote = MOCK_QUOTES.find(q => q.code === code) || MOCK_QUOTES[0];
  const history: PEHistoryPoint[] = [];
  const now = new Date();
  const basePE = quote.pe;
  for (let i = 0; i < 250; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (250 - i) * 1);
    const noise = (Math.random() - 0.5) * basePE * 0.4;
    history.push({ date: d.toISOString().slice(0, 10), pe: +(basePE + noise).toFixed(1), price: 0 });
  }
  const allPEs = history.map(h => h.pe).sort((a, b) => a - b);
  const currentPE = history[history.length - 1]?.pe || basePE;
  const percentile = +(allPEs.filter(pe => pe <= currentPE).length / allPEs.length * 100).toFixed(1);
  
  return {
    stockCode: code, stockName: quote.name,
    currentPE, percentile, minPE: allPEs[0], maxPE: allPEs[allPEs.length - 1], medianPE: allPEs[Math.floor(allPEs.length / 2)],
    history,
    peers: MOCK_STOCKS.filter(s => s.industry === MOCK_STOCKS.find(st => st.code === code)?.industry).slice(0, 5).map(s => {
      const q = MOCK_QUOTES.find(qq => qq.code === s.code);
      return { name: s.name, pe: q?.pe || 20, pb: q?.pb || 3, roe: 15 + Math.random() * 20 };
    }),
  };
}

// ---------- DCF 数据 ----------
const defaultDCFParams = { revenueCAGR: 15, netMargin: 50, capexRate: 5, wcChangeRate: 2, terminalGrowth: 3, wacc: 9, stage1Years: 5 };

export function calculateDCF(params: Partial<typeof defaultDCFParams> = {}): DCFResult {
  const p = { ...defaultDCFParams, ...params };
  const baseRevenue = 1505.6; // 亿
  const cashFlows: DCFResult['cashFlows'] = [];
  let cumulativePV = 0;
  
  for (let i = 1; i <= p.stage1Years; i++) {
    const revenue = baseRevenue * Math.pow(1 + p.revenueCAGR / 100, i);
    const netProfit = revenue * p.netMargin / 100;
    const capex = revenue * p.capexRate / 100;
    const wcChange = revenue * p.wcChangeRate / 100;
    const fcf = netProfit - capex - wcChange;
    const discountFactor = Math.pow(1 + p.wacc / 100, i);
    const discountedFCF = fcf / discountFactor;
    cumulativePV += discountedFCF;
    cashFlows.push({ year: 2024 + i - 1, revenue: Math.round(revenue), fcf: Math.round(fcf), discountedFCF: Math.round(discountedFCF), cumulativePV: Math.round(cumulativePV) });
  }
  
  const lastFCF = cashFlows[cashFlows.length - 1].fcf;
  const terminalValue = (lastFCF * (1 + p.terminalGrowth / 100)) / (p.wacc / 100 - p.terminalGrowth / 100);
  const terminalPV = terminalValue / Math.pow(1 + p.wacc / 100, p.stage1Years);
  const enterpriseValue = cumulativePV + terminalPV;
  const netDebt = -280;
  const equityValue = enterpriseValue - netDebt;
  const perShareValue = equityValue / 12.562;
  const currentPrice = 1688;
  const safetyMargin = +((perShareValue - currentPrice) / currentPrice * 100).toFixed(1);
  
  // 敏感性分析
  const waccRange = [7, 8, 9, 10, 11];
  const growthRange = [2.0, 2.5, 3.0, 3.5, 4.0];
  const sensitivity = waccRange.map(w => 
    growthRange.map(g => {
      const tv2 = (lastFCF * (1 + g / 100)) / (w / 100 - g / 100);
      const ev2 = cumulativePV + tv2 / Math.pow(1 + w / 100, p.stage1Years);
      return { wacc: w, growth: g, value: Math.round((ev2 - netDebt) / 12.562) };
    })
  );
  
  return { enterpriseValue: Math.round(enterpriseValue), netDebt, equityValue: Math.round(equityValue), perShareValue: +perShareValue.toFixed(0), currentPrice, safetyMargin, cashFlows, terminalValue: Math.round(terminalValue), sensitivity };
}

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
