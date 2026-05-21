---
name: vitest
description: Vitest 现代测试框架
tags: [testing, vitest, jest, unit-test]
---

# Vitest 测试技能

## 触发条件

- Vite 项目测试
- 快速单元测试
- 快照测试
- 覆盖率分析

## 安装配置

```bash
# 安装
npm install vitest --save-dev

# 配置文件
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

## 基础测试

```typescript
// src/utils/math.test.ts
import { describe, it, expect } from 'vitest';
import { add, subtract } from './math';

describe('Math utils', () => {
  it('adds two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('subtracts two numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });
});
```

## 组件测试

```typescript
// src/components/Counter.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Counter from './Counter';

describe('Counter', () => {
  it('renders with initial count', () => {
    render(<Counter initialCount={0} />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  it('increments on click', async () => {
    render(<Counter initialCount={0} />);
    fireEvent.click(screen.getByText('Increment'));
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

## 快照测试

```typescript
// src/components/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('matches snapshot', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container).toMatchSnapshot();
  });
});
```

## Mock

```typescript
// src/services/api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchUser } from './api';

// Mock fetch
vi.stubGlobal('fetch', vi.fn());

describe('API', () => {
  it('fetches user', async () => {
    const mockUser = { id: 1, name: 'John' };
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser),
    });

    const user = await fetchUser(1);
    expect(user).toEqual(mockUser);
  });
});
```

## 覆盖率

```bash
# 运行覆盖率
npx vitest run --coverage

# 配置阈值
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

## 最佳实践

### 测试组织
```typescript
// 按功能分组
describe('User', () => {
  describe('validation', () => {
    it('validates email');
    it('validates password');
  });
  
  describe('authentication', () => {
    it('logs in');
    it('logs out');
  });
});
```

### 异步测试
```typescript
// Promise
it('resolves', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

// Observable
it('emits', async () => {
  const values = await collectFromObservable(observable);
  expect(values).toEqual([1, 2, 3]);
});
```

### 性能
- 使用 `vi.fn()` 替代 `jest.fn()`
- 使用 `vi.stubGlobal()` 替代全局 mock
- 并行运行测试

---

**技能版本**：v1.0
