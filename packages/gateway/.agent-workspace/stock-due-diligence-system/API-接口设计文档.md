# 📡 股票基本面深度尽调分析系统 — API 接口设计文档

> **版本**: v1.0  
> **基础路径**: `/api/v1`  
> **认证方式**: Bearer Token (JWT)

---

## 一、API 总览

### 1.1 模块划分

| 模块 | 前缀 | 描述 |
|------|------|------|
| 公司服务 | `/companies` | 公司基本信息、搜索、分类 |
| 财务服务 | `/financials` | 财务报表、财务指标、杜邦分析 |
| 估值服务 | `/valuations` | 相对估值、DCF 估值 |
| 风险服务 | `/risks` | 风险检测、评分、模型 |
| 业务分析 | `/business` | 营收结构、护城河、行业分析 |
| 管理层 | `/management` | 高管信息、股权结构、关联交易 |
| 公告服务 | `/announcements` | 公告列表、AI解读、事件时间线 |
| AI 服务 | `/ai` | 智能问答、洞察生成、异常检测 |
| 报告服务 | `/reports` | 尽调报告生成、模板管理、导出 |
| 用户服务 | `/users` | 认证、自选股、自定义指标 |
| 行情服务 | `/quotes` | 实时行情、历史K线 |

### 1.2 通用响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2024-06-01T12:00:00Z",
  "requestId": "req_abc123"
}
```

### 1.3 通用分页参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20，最大 100 |
| sortBy | string | 否 | 排序字段 |
| sortOrder | string | 否 | asc / desc |

---

## 二、公司服务 `/companies`

### 2.1 搜索公司

```
GET /companies/search?q={keyword}
```

**Query 参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| q | string | 是 | 搜索关键词（代码/名称/拼音） |
| market | string | 否 | SH/SZ/BJ/HK/US |
| industry | string | 否 | 行业代码 |
| limit | number | 否 | 返回数量，默认 10 |

**响应**:
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "code": "600519",
        "name": "贵州茅台",
        "market": "SH",
        "industry": "白酒",
        "industryCode": "C1512",
        "listDate": "2001-08-27",
        "logo": "https://...",
        "tags": ["白酒", "消费", "沪深300"]
      }
    ],
    "total": 1
  }
}
```

### 2.2 获取公司详情

```
GET /companies/{code}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "code": "600519",
    "name": "贵州茅台",
    "fullName": "贵州茅台酒股份有限公司",
    "englishName": "Kweichow Moutai Co., Ltd.",
    "market": "SH",
    "exchange": "上交所",
    "industry": "白酒",
    "industryCode": "C1512",
    "listDate": "2001-08-27",
    "registeredCapital": "12.56亿",
    "employees": 29376,
    "website": "https://www.moutaichina.com",
    "address": "贵州省仁怀市茅台镇",
    "introduction": "...",
    "mainBusiness": "茅台酒及系列酒的生产与销售",
    "currentPrice": 1650.00,
    "marketCap": 20724.0,
    "pe_ttm": 25.3,
    "pb": 8.2,
    "totalShares": 12.56,
    "floatShares": 12.56,
    "latestReportDate": "2023-12-31",
    "reportStatus": "已披露年报",
    "tags": ["白酒", "消费龙头", "沪深300", "MSCI中国"]
  }
}
```

### 2.3 行业列表

```
GET /industries
```

### 2.4 行业内公司

```
GET /industries/{code}/companies
```

---

## 三、财务服务 `/financials`

### 3.1 获取财务报表

```
GET /companies/{code}/financials/statements
```

**Query 参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| type | string | 是 | balance / income / cashflow |
| period | string | 否 | annual / quarterly / ttm |
| startYear | number | 否 | 起始年份，默认近5年 |
| endYear | number | 否 | 结束年份 |
| reportType | string | 否 | 合并/母公司，默认合并 |

**响应 (以利润表为例)**:
```json
{
  "code": 200,
  "data": {
    "type": "income",
    "company": { "code": "600519", "name": "贵州茅台" },
    "periods": [
      {
        "reportDate": "2023-12-31",
        "reportType": "年报",
        "items": {
          "revenue": 150560000000,
          "cost_of_revenue": 10820000000,
          "gross_profit": 139740000000,
          "selling_expense": 3850000000,
          "admin_expense": 8230000000,
          "rd_expense": 580000000,
          "operating_profit": 103680000000,
          "net_income": 74730000000,
          "net_income_excl": 74510000000,
          "eps_basic": 59.49,
          "eps_diluted": 59.49
        },
        "yoy": {
          "revenue": 0.180,
          "net_income": 0.191,
          "gross_profit": 0.189
        }
      },
      // ... 更多期间
    ]
  }
}
```

### 3.2 获取财务指标

```
GET /companies/{code}/financials/indicators
```

**Query 参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| category | string | 否 | profitability / growth / efficiency / leverage / cashflow / all |
| startYear | number | 否 | 起始年份 |
| period | string | 否 | annual / quarterly |

**响应**:
```json
{
  "code": 200,
  "data": {
    "company": { "code": "600519", "name": "贵州茅台" },
    "indicators": {
      "profitability": {
        "gross_margin": { "value": 0.928, "rank_percentile": 95 },
        "net_margin": { "value": 0.496, "rank_percentile": 98 },
        "roe": { "value": 0.335, "rank_percentile": 92 },
        "roa": { "value": 0.309, "rank_percentile": 97 },
        "roic": { "value": 0.322, "rank_percentile": 95 }
      },
      "growth": {
        "revenue_growth_yoy": { "value": 0.180, "rank_percentile": 75 },
        "revenue_growth_cagr_5y": { "value": 0.156, "rank_percentile": 72 },
        "net_income_growth_yoy": { "value": 0.191, "rank_percentile": 78 },
        "fcf_growth_yoy": { "value": 0.165, "rank_percentile": 70 }
      },
      "efficiency": {
        "asset_turnover": { "value": 0.62, "rank_percentile": 45 },
        "inventory_turnover": { "value": 0.35, "rank_percentile": 20 },
        "receivable_turnover": { "value": 52.3, "rank_percentile": 95 }
      },
      "leverage": {
        "debt_to_asset": { "value": 0.218, "rank_percentile": 15 },
        "current_ratio": { "value": 4.26, "rank_percentile": 90 },
        "interest_coverage": { "value": null, "note": "无有息负债" }
      },
      "cashflow": {
        "ocf_to_net_income": { "value": 0.89, "rank_percentile": 65 },
        "fcf": { "value": 62800000000, "rank_percentile": 95 },
        "capex_to_depreciation": { "value": 1.2, "rank_percentile": 55 },
        "dividend_payout_ratio": { "value": 0.515, "rank_percentile": 85 }
      }
    },
    "radar_scores": {
      "profitability": 95,
      "growth": 78,
      "efficiency": 55,
      "leverage": 90,
      "cashflow": 85,
      "overall": 82
    }
  }
}
```

### 3.3 杜邦分析

```
GET /companies/{code}/financials/dupont
```

**Query 参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| year | number | 否 | 年份，默认最新 |

**响应**:
```json
{
  "code": 200,
  "data": {
    "roe": 0.335,
    "components": {
      "net_margin": 0.496,
      "asset_turnover": 0.62,
      "equity_multiplier": 1.09
    },
    "details": {
      "net_income": 74730000000,
      "revenue": 150560000000,
      "total_assets": 242270000000,
      "total_equity": 222140000000
    },
    "history": [
      { "year": 2019, "roe": 0.312, "net_margin": 0.472, "asset_turnover": 0.60, "equity_multiplier": 1.10 },
      { "year": 2020, "roe": 0.289, "net_margin": 0.458, "asset_turnover": 0.57, "equity_multiplier": 1.10 },
      { "year": 2021, "roe": 0.301, "net_margin": 0.468, "asset_turnover": 0.59, "equity_multiplier": 1.09 },
      { "year": 2022, "roe": 0.318, "net_margin": 0.484, "asset_turnover": 0.61, "equity_multiplier": 1.08 },
      { "year": 2023, "roe": 0.335, "net_margin": 0.496, "asset_turnover": 0.62, "equity_multiplier": 1.09 }
    ],
    "drivers_analysis": {
      "primary_driver": "net_margin",
      "trend": "improving",
      "note": "净利率持续提升是ROE增长的主要驱动力"
    }
  }
}
```

---

## 四、估值服务 `/valuations`

### 4.1 相对估值

```
GET /companies/{code}/valuations/relative
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "current": {
      "pe_ttm": 25.3,
      "pb": 8.2,
      "ps": 12.5,
      "peg": 1.41,
      "ev_ebitda": 18.6
    },
    "historical_percentile": {
      "pe_ttm": { "value": 25.3, "percentile": 18.5, "period": "10Y", "level": "偏低" },
      "pb": { "value": 8.2, "percentile": 22.0, "period": "10Y", "level": "偏低" },
      "ps": { "value": 12.5, "percentile": 25.3, "period": "10Y", "level": "中偏低" }
    },
    "pe_band": {
      "min": 18.2,
      "max": 62.5,
      "avg": 35.8,
      "median": 33.2,
      "percentile_25": 26.5,
      "percentile_75": 42.8,
      "history": [
        { "date": "2014-01-01", "pe": 12.5 },
        { "date": "2015-01-01", "pe": 18.3 },
        // ... 每月数据点
      ]
    },
    "peer_comparison": [
      { "code": "600519", "name": "贵州茅台", "pe_ttm": 25.3, "pb": 8.2, "ps": 12.5, "roe": 0.335, "growth": 0.18 },
      { "code": "000858", "name": "五粮液", "pe_ttm": 18.6, "pb": 4.5, "ps": 7.2, "roe": 0.241, "growth": 0.123 },
      { "code": "000568", "name": "泸州老窖", "pe_ttm": 22.1, "pb": 7.1, "ps": 10.8, "roe": 0.32, "growth": 0.205 }
    ]
  }
}
```

### 4.2 DCF 估值模型

```
POST /companies/{code}/valuations/dcf/calculate
```

**请求体**:
```json
{
  "stage1_years": 5,
  "revenue_growth_rates": [0.15, 0.13, 0.12, 0.10, 0.08],
  "net_margin": 0.50,
  "capex_ratio": 0.05,
  "working_capital_change": 0.02,
  "terminal_growth_rate": 0.03,
  "wacc": 0.09,
  "risk_free_rate": 0.028,
  "beta": 0.65,
  "market_risk_premium": 0.06
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "enterprise_value": 2458000000000,
    "net_debt": -28000000000,
    "equity_value": 2486000000000,
    "total_shares": 1256000000,
    "intrinsic_value_per_share": 1979,
    "current_price": 1650,
    "margin_of_safety": 0.199,
    "projected_fcf": [
      { "year": 2024, "fcf": 58500000000 },
      { "year": 2025, "fcf": 66700000000 },
      { "year": 2026, "fcf": 75200000000 },
      { "year": 2027, "fcf": 83800000000 },
      { "year": 2028, "fcf": 90500000000 }
    ],
    "terminal_value": 1553000000000,
    "sensitivity_table": {
      "wacc_values": [0.07, 0.08, 0.09, 0.10, 0.11],
      "terminal_growth_values": [0.02, 0.025, 0.03, 0.035, 0.04],
      "values_per_share": [
        [2456, 2650, 2892, 3210, 3645],
        [2089, 2232, 2405, 2618, 2886],
        [1812, 1920, 1979, 2135, 2302],
        [1596, 1680, 1778, 1894, 2032],
        [1425, 1492, 1569, 1660, 1767]
      ]
    }
  }
}
```

---

## 五、风险服务 `/risks`

### 5.1 风险评估

```
GET /companies/{code}/risks/assessment
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "overall_score": 22,
    "overall_level": "低风险",
    "overall_color": "green",
    "categories": [
      {
        "category": "earnings_quality",
        "name": "收益质量",
        "score": 85,
        "level": "优秀",
        "indicators": [
          { "name": "OCF/净利润", "value": 0.89, "benchmark": ">0.8", "status": "pass", "description": "经营现金流与净利润匹配度良好" },
          { "name": "应收账款增速/营收增速", "value": 0.75, "benchmark": "<1.0", "status": "pass", "description": "应收账款增速低于营收增速" },
          { "name": "非经常性损益/净利润", "value": 0.003, "benchmark": "<0.1", "status": "pass", "description": "非经常性损益占比极低" }
        ]
      },
      {
        "category": "leverage_risk",
        "name": "偿债风险",
        "score": 92,
        "level": "极低",
        "indicators": [
          { "name": "资产负债率", "value": 0.218, "benchmark": "<0.6", "status": "pass" },
          { "name": "流动比率", "value": 4.26, "benchmark": ">1.5", "status": "pass" },
          { "name": "有息负债率", "value": 0.0, "benchmark": "<0.3", "status": "pass" }
        ]
      },
      {
        "category": "governance_risk",
        "name": "治理风险",
        "score": 78,
        "level": "低",
        "indicators": [
          { "name": "关联交易占比", "value": 0.12, "benchmark": "<0.2", "status": "pass" },
          { "name": "大股东质押率", "value": 0.0, "benchmark": "<0.3", "status": "pass" },
          { "name": "商誉/总资产", "value": 0.0, "benchmark": "<0.1", "status": "pass" }
        ]
      }
    ],
    "beneish_m_score": {
      "score": -2.85,
      "threshold": -1.78,
      "conclusion": "低舞弊概率",
      "components": {
        "dsri": 0.95,
        "gmi": 1.02,
        "aqi": 0.98,
        "sgi": 1.18,
        "depi": 0.96,
        "sgai": 0.92,
        "lvgi": 0.97,
        "tata": -0.05
      }
    },
    "altman_z_score": {
      "score": 8.5,
      "zone": "安全区",
      "threshold": { "safe": 2.99, "grey": 1.81 }
    }
  }
}
```

---

## 六、业务分析 `/business`

### 6.1 营收结构

```
GET /companies/{code}/business/revenue-structure
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "by_product": [
      { "name": "茅台酒", "revenue": 126590000000, "ratio": 0.841, "growth": 0.175 },
      { "name": "系列酒", "revenue": 20630000000, "ratio": 0.137, "growth": 0.294 },
      { "name": "其他", "revenue": 3340000000, "ratio": 0.022, "growth": 0.052 }
    ],
    "by_channel": [
      { "name": "直销", "revenue": 53520000000, "ratio": 0.355, "growth": 0.325 },
      { "name": "批发代理", "revenue": 97040000000, "ratio": 0.645, "growth": 0.105 }
    ],
    "by_region": [
      { "name": "国内", "revenue": 145000000000, "ratio": 0.963 },
      { "name": "国外", "revenue": 5560000000, "ratio": 0.037 }
    ],
    "history": [
      { "year": 2021, "by_product": [...] },
      { "year": 2022, "by_product": [...] }
    ]
  }
}
```

### 6.2 护城河评估

```
GET /companies/{code}/business/moat
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "overall_score": 8.5,
    "width": "宽",
    "dimensions": [
      { "dimension": "brand", "name": "品牌护城河", "score": 9.0, "description": "品牌价值全球领先，溢价能力极强" },
      { "dimension": "switching_cost", "name": "转换成本", "score": 7.0, "description": "用户转换成本中等" },
      { "dimension": "network_effect", "name": "网络效应", "score": null, "description": "无明显网络效应，但存在规模效应" },
      { "dimension": "cost_advantage", "name": "成本优势", "score": 9.5, "description": "地理位置独特，不可复制" },
      { "dimension": "intangible_assets", "name": "无形资产", "score": 9.0, "description": "酿造工艺、品牌商标、历史文化底蕴" }
    ],
    "peer_comparison": [
      { "code": "600519", "name": "贵州茅台", "moat_score": 8.5, "width": "宽" },
      { "code": "000858", "name": "五粮液", "moat_score": 7.2, "width": "中" },
      { "code": "000568", "name": "泸州老窖", "moat_score": 6.8, "width": "中" }
    ]
  }
}
```

### 6.3 行业分析

```
GET /industries/{code}/analysis
```

---

## 七、管理层 `/management`

### 7.1 高管列表

```
GET /companies/{code}/management/executives
```

### 7.2 股权结构

```
GET /companies/{code}/management/ownership
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "actual_controller": {
      "name": "贵州省人民政府国有资产监督管理委员会",
      "type": "政府机构",
      "holding_ratio": 0.54,
      "chain": ["贵州省国资委 → 中国贵州茅台酒厂(集团)有限责任公司 → 贵州茅台酒股份有限公司"]
    },
    "top_shareholders": [
      { "name": "中国贵州茅台酒厂(集团)有限责任公司", "shares": 6787000000, "ratio": 0.540, "type": "国有法人", "pledged": false },
      { "name": "香港中央结算有限公司", "shares": 980000000, "ratio": 0.078, "type": "境外法人", "pledged": false }
    ],
    "institutional_holders": [...]
  }
}
```

---

## 八、公告服务 `/announcements`

### 8.1 公告列表

```
GET /companies/{code}/announcements
```

### 8.2 公告 AI 解读

```
POST /announcements/{id}/ai-summary
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "summary": "公司2023年年报显示营收同比增长18.0%，净利润增长19.1%，分红方案为每股派现59.5元...",
    "key_points": [
      "营收1505.6亿元，同比+18.0%",
      "净利润747.3亿元，同比+19.1%",
      "每股分红59.5元，分红率51.5%",
      "直销渠道占比提升至35.5%"
    ],
    "sentiment": "positive",
    "impact_analysis": "正面，业绩超市场预期"
  }
}
```

### 8.3 重大事件时间线

```
GET /companies/{code}/timeline
```

---

## 九、AI 服务 `/ai`

### 9.1 智能问答

```
POST /ai/chat
```

**请求体**:
```json
{
  "company_code": "600519",
  "question": "茅台的自由现金流在过去5年的趋势如何？主要驱动因素是什么？",
  "context": []
}
```

**响应 (SSE 流式)**:
```
data: {"type": "text", "content": "贵州茅台的自由现金流在过去5年呈持续增长趋势："}
data: {"type": "text", "content": "\n\n| 年份 | FCF (亿元) | 同比变化 |"}
data: {"type": "text", "content": "\n|------|-----------|---------|"}
data: {"type": "text", "content": "\n| 2019 | 380.5 | +15.2% |"}
data: {"type": "text", "content": "\n\n主要驱动因素："}
data: {"type": "text", "content": "\n1. 营收持续增长..."}
data: {"type": "reference", "sources": ["financial_statements", "financial_indicators"]}
data: {"type": "done"}
```

### 9.2 投资亮点/风险点生成

```
POST /ai/highlights-risks
```

**请求体**:
```json
{
  "company_code": "600519"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "highlights": [
      { "category": "财务", "point": "ROE持续保持在30%以上，盈利质量极高", "support_data": { "roe_5y_avg": 0.311 } },
      { "category": "商业模式", "point": "品牌溢价能力极强，毛利率超过92%", "support_data": { "gross_margin": 0.928 } },
      { "category": "现金流", "point": "几乎零有息负债，现金储备充裕", "support_data": { "debt_to_asset": 0.218 } }
    ],
    "risks": [
      { "category": "增长", "point": "营收增速放缓趋势明显，从26%降至18%", "severity": "medium" },
      { "category": "估值", "point": "当前PE虽在历史低位，但绝对估值仍不便宜", "severity": "low" },
      { "category": "政策", "point": "白酒行业面临消费税改革风险", "severity": "medium" }
    ]
  }
}
```

---

## 十、报告服务 `/reports`

### 10.1 生成尽调报告

```
POST /reports/generate
```

**请求体**:
```json
{
  "company_code": "600519",
  "template": "standard",
  "sections": ["overview", "business", "financials", "valuation", "risk", "management", "conclusion"],
  "options": {
    "include_dcf": true,
    "include_peer_comparison": true,
    "include_charts": true,
    "ai_enhanced": true
  }
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "report_id": "rpt_abc123",
    "status": "generating",
    "estimated_time": 25,
    "poll_url": "/api/v1/reports/rpt_abc123/status"
  }
}
```

### 10.2 报告状态查询

```
GET /reports/{id}/status
```

### 10.3 报告下载

```
GET /reports/{id}/download?format=pdf
```

### 10.4 报告列表

```
GET /reports?company_code={code}
```

---

## 十一、用户服务 `/users`

### 11.1 注册/登录

```
POST /auth/register
POST /auth/login
POST /auth/refresh
```

### 11.2 自选股

```
GET    /users/me/watchlist
POST   /users/me/watchlist          { "company_code": "600519" }
DELETE /users/me/watchlist/{code}
```

### 11.3 自定义指标

```
GET    /users/me/custom-indicators
POST   /users/me/custom-indicators  { "name": "EBIT/企业价值", "formula": "ebit / enterprise_value" }
PUT    /users/me/custom-indicators/{id}
DELETE /users/me/custom-indicators/{id}
```

---

## 十二、WebSocket 接口

### 12.1 实时行情推送

```
WS /ws/quotes?codes=600519,000858
```

### 12.2 AI 对话流

```
WS /ws/ai/chat
```

---

## 十三、错误码

| 错误码 | 描述 |
|-------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求频率过高 |
| 500 | 服务器内部错误 |
| 10001 | 公司代码不存在 |
| 10002 | 财务数据不存在 |
| 10003 | 报告生成失败 |
| 10004 | AI 服务不可用 |
| 20001 | 用户已存在 |
| 20002 | 账号或密码错误 |
| 20003 | Token 已过期 |
