---
name: jest-development
description: Jest 单元测试最佳实践
tags: [testing, javascript, jest, unit-test]
---

# Jest 测试技能

## 触发条件

- JavaScript/TypeScript 单元测试
- Mock 和 Spy
- 快照测试
- 覆盖率分析

## 基础用法

### 测试结构
```typescript
// user.test.ts
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  
  beforeEach(() => {
    service = new UserService();
  });
  
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const user = await service.createUser({
        name: 'John',
        email: 'john@example.com'
      });
      
      expect(user).toBeDefined();
      expect(user.name).toBe('John');
    });
    
    it('should throw error for invalid email', async () => {
      await expect(
        service.createUser({ name: 'John', email: 'invalid' })
      ).rejects.toThrow('Invalid email');
    });
  });
});
```

### Mock 外部依赖
```typescript
// Mock 模块
jest.mock('./database', () => ({
  db: {
    users: {
      create: jest.fn(),
      findMany: jest.fn(),
    }
  }
}));

// Mock 函数
const mockCreate = jest.fn();
mockCreate.mockResolvedValue({ id: 1, name: 'John' });
```

### Spy 监视
```typescript
const spy = jest.spyOn(service, 'validateEmail');
spy.mockReturnValue(true);

expect(service.validateEmail('test@example.com')).toBe(true);
expect(spy).toHaveBeenCalledWith('test@example.com');
```

## 快照测试

```typescript
it('should render correctly', () => {
  const tree = renderer.create(
    <UserCard name="John" email="john@example.com" />
  ).toJSON();
  
  expect(tree).toMatchSnapshot();
});
```

## 异步测试

```typescript
// Promise
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toEqual({ id: 1 });
});

// Observable
it('should emit values', (done) => {
  observable.subscribe(value => {
    expect(value).toBe(1);
    done();
  });
});
```

## 覆盖率配置

```json
// jest.config.js
{
  "coverageDirectory": "coverage",
  "coverageReporters": ["text", "lcov"],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## 常用匹配器

```typescript
expect(value).toBe(1)           // 严格相等
expect(value).toEqual({})       // 深度相等
expect(value).toBeTruthy()      // 真值
expect(value).toContain('a')    // 包含
expect(value).toHaveLength(3)   // 长度
expect(fn).toThrow()            // 抛出错误
expect(promise).resolves()      // Promise 解析
expect(promise).rejects()       // Promise 拒绝
```

---

**技能版本**：v1.0
