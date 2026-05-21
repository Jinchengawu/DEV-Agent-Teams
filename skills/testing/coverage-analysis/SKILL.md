---
name: coverage-analysis
description: 代码覆盖率分析和优化
tags: [testing, coverage, quality, metrics]
---

# 覆盖率分析技能

## 触发条件

- 分析测试覆盖率
- 识别未测试代码
- 设置覆盖率阈值
- 生成覆盖率报告

## 覆盖率类型

### 行覆盖率 (Line Coverage)
```python
# 每行代码是否被执行
def add(a, b):
    return a + b  # 这行是否被执行
```

### 分支覆盖率 (Branch Coverage)
```python
# 每个分支是否被执行
def check_age(age):
    if age >= 18:  # True 分支
        return "adult"
    else:          # False 分支
        return "minor"
```

### 函数覆盖率 (Function Coverage)
```python
# 每个函数是否被调用
def function_a():
    pass

def function_b():
    pass
```

## Python (pytest-cov)

```bash
# 安装
pip install pytest-cov

# 运行覆盖率
pytest --cov=src --cov-report=html

# 设置阈值
pytest --cov=src --cov-fail-under=80
```

### 配置文件
```ini
# pytest.ini
[pytest]
addopts = --cov=src --cov-report=html --cov-report=term
cov_fail_under = 80
```

### HTML 报告
```bash
pytest --cov=src --cov-report=html
open htmlcov/index.html
```

## JavaScript (Jest)

```bash
# 运行覆盖率
npm test -- --coverage

# 配置
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## 覆盖率报告分析

### 关键指标
```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   85.23 |    78.45 |   92.31 |   84.67 |
 src               |   90.12 |    82.34 |   95.67 |   89.45 |
  app.ts           |   95.00 |    80.00 |  100.00 |   94.44 |
  utils.ts         |   85.23 |    76.92 |   88.89 |   84.85 |
-------------------|---------|----------|---------|---------|
```

### 解读
- **Stmts**：语句覆盖率
- **Branch**：分支覆盖率
- **Funcs**：函数覆盖率
- **Lines**：行覆盖率

## 提升覆盖率

### 识别未覆盖代码
```bash
# 生成详细报告
pytest --cov=src --cov-report=term-missing

# 输出
Name                       Stmts   Miss  Cover   Missing
--------------------------------------------------------
src/app.py                    50      5    90%   45-49, 62
src/utils.py                  30     10    67%   15-24, 38-42
```

### 优先级
1. 优先覆盖核心业务逻辑
2. 覆盖边界条件和异常路径
3. 覆盖关键用户流程

## CI 集成

```yaml
# GitHub Actions
- name: Run tests with coverage
  run: |
    npm test -- --coverage
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## 最佳实践

### 覆盖率目标
- 行覆盖率：> 80%
- 分支覆盖率：> 70%
- 函数覆盖率：> 90%

### 避免
- 为了覆盖率而写无意义测试
- 忽略低质量测试
- 覆盖率作为唯一指标

### 结合
- 代码审查
- 静态分析
- 手动测试

---

**技能版本**：v1.0
