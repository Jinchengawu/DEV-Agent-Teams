# 📊 股票基本面深度尽调分析系统

一个专业的股票基本面深度分析系统，支持A股、港股、美股的全面财务分析和估值评估。

## 🎯 系统特点

- **多市场支持**: A股、港股、美股数据
- **深度分析**: 50+ 财务指标分析
- **智能估值**: 多种估值模型（DCF、PE、PB、PEG等）
- **行业对比**: 同行业公司横向对比
- **风险预警**: 财务风险自动识别
- **可视化报告**: 自动生成分析报告

## 📁 项目结构

```
stock-analysis-system/
├── src/
│   ├── api/           # API路由和端点
│   ├── core/          # 核心配置和依赖
│   ├── data/          # 数据获取和处理
│   ├── models/        # 数据模型
│   ├── services/      # 业务逻辑服务
│   └── utils/         # 工具函数
├── config/            # 配置文件
├── tests/             # 测试文件
├── scripts/           # 脚本工具
└── docs/              # 文档
```

## 🚀 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置API密钥等
```

### 3. 启动服务
```bash
python -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 访问API文档
```
http://localhost:8000/docs
```

## 📊 核心功能

### 1. 财务健康度分析
- 偿债能力分析（流动比率、速动比率、资产负债率）
- 盈利能力分析（ROE、ROA、净利率、毛利率）
- 运营效率分析（应收账款周转率、存货周转率）
- 现金流分析（经营现金流、自由现金流）

### 2. 成长性分析
- 营收增长率趋势
- 净利润增长率趋势
- 毛利率变化趋势
- 研发投入占比

### 3. 估值分析
- PE（市盈率）估值
- PB（市净率）估值
- PEG估值
- DCF（现金流折现）估值
- EV/EBITDA估值

### 4. 行业对比分析
- 同行业财务指标对比
- 行业地位评估
- 竞争优势分析

### 5. 风险预警
- 财务造假风险识别
- 持续经营风险评估
- 流动性风险预警

## 🔧 技术栈

- **Python 3.9+**
- **FastAPI** - Web框架
- **SQLAlchemy** - ORM
- **PostgreSQL/SQLite** - 数据库
- **Pandas/NumPy** - 数据处理
- **yfinance/tushare** - 数据获取
- **Plotly/Matplotlib** - 数据可视化

## 📈 API接口

### 获取公司信息
```
GET /api/v1/company/{stock_code}
```

### 获取财务分析报告
```
GET /api/v1/analysis/{stock_code}
```

### 获取估值分析
```
GET /api/v1/valuation/{stock_code}
```

### 获取行业对比
```
GET /api/v1/industry-comparison/{stock_code}
```

## 📄 License

MIT License