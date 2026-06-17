/**
 * 格式化工具函数
 */

/** 格式化金额（万元 → 亿元，保留2位小数） */
export function formatMoney(value: number, unit: 'wan' | 'yi' = 'yi'): string {
  if (unit === 'yi') {
    const yi = value / 10000;
    if (Math.abs(yi) >= 1) return `${yi.toFixed(2)}亿`;
    return `${(yi * 10000).toFixed(0)}万`;
  }
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(2)}亿`;
  return `${value.toFixed(0)}万`;
}

/** 格式化百分比 */
export function formatPercent(value: number, decimals = 2): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}%`;
}

/** 格式化大数字（万/亿） */
export function formatLargeNumber(value: number): string {
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
  if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
  return value.toFixed(2);
}

/** 格式化价格 */
export function formatPrice(value: number): string {
  return value.toFixed(2);
}

/** 格式化市值 */
export function formatMarketCap(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万亿`;
  if (value >= 1) return `${value.toFixed(0)}亿`;
  return `${(value * 10000).toFixed(0)}万`;
}

/** 涨跌颜色class */
export function getChangeColor(value: number): string {
  if (value > 0) return 'text-rise';
  if (value < 0) return 'text-fall';
  return 'text-dark-400';
}

/** 评级颜色 */
export function getRatingColor(rating: string): string {
  switch (rating) {
    case '强烈推荐': return 'bg-rise/20 text-rise border-rise/30';
    case '推荐': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case '中性': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case '谨慎': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case '回避': return 'bg-dark-600/20 text-dark-400 border-dark-600/30';
    default: return 'bg-dark-600/20 text-dark-400';
  }
}

/** 风险等级颜色 */
export function getRiskColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'bg-rise/20 text-rise';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'low': return 'bg-green-500/20 text-green-400';
  }
}

/** 趋势箭头 */
export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return '↑';
    case 'down': return '↓';
    case 'stable': return '→';
  }
}

/** 生成唯一ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
