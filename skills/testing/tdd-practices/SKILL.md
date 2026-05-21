---
name: tdd-practices
description: 测试驱动开发最佳实践
tags: [testing, tdd, red-green-refactor]
---

# TDD 最佳实践

## 核心流程

### Red-Green-Refactor
1. **Red**：编写失败的测试
2. **Green**：编写最少代码使测试通过
3. **Refactor**：重构代码保持测试通过

## 示例：实现计算器

### 第一步：Red
```python
# test_calculator.py
def test_add():
    calc = Calculator()
    assert calc.add(2, 3) == 5
```

运行测试 → 失败

### 第二步：Green
```python
# calculator.py
class Calculator:
    def add(self, a, b):
        return a + b
```

运行测试 → 通过

### 第三步：Refactor
```python
# 代码已足够简单，无需重构
```

## TDD 规则

### 三条规则
1. 不编写任何产品代码，除非有失败的测试
2. 编写刚好失败的测试，不超过一个断言
3. 编写刚好足够的代码使测试通过

### 好处
- 代码覆盖率高
- 设计更好
- 重构安全
- 文档化行为

## 测试策略

### 单元测试
```python
def test_user_creation():
    user = create_user("John", "john@example.com")
    assert user.name == "John"
    assert user.email == "john@example.com"
```

### 集成测试
```python
def test_user_registration():
    # 测试完整流程
    response = client.post("/api/register", json={
        "name": "John",
        "email": "john@example.com",
        "password": "secure123"
    })
    assert response.status_code == 201
```

## 常见陷阱

1. **避免**
   - 跳过红灯阶段
   - 测试太多断言
   - 不重构
   - 测试实现细节

2. **正确做法**
   - 严格遵循红绿重构
   - 每个测试一个概念
   - 持续重构
   - 测试行为

---

**技能版本**：v1.0
