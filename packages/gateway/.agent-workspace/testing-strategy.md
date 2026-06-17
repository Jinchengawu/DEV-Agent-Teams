# 测试策略与方案

## 1. 测试金字塔

```
       E2E测试 (Playwright)
          /    \
     集成测试    
        /    \
   单元测试 (Jest/Vitest)
```

## 2. 技术栈

- **单元测试**: Jest (Node.js/React), Vitest (Vite项目)
- **E2E测试**: Playwright
- **覆盖率**: Jest内置覆盖率, Vitest覆盖率, Playwright代码覆盖率
- **测试工具**: React Testing Library, Supertest (API测试)

## 3. 测试策略

### 3.1 单元测试 (Jest/Vitest)

#### 测试原则
- 测试独立：每个测试用例独立运行，不依赖其他测试
- 快速执行：单元测试应在毫秒级完成
- 隔离性：使用mock/stub隔离外部依赖

#### 测试用例示例

**计数器组件测试 (React)**
```javascript
// counter.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Counter from './Counter';

describe('Counter Component', () => {
  test('初始计数为0', () => {
    render(<Counter />);
    expect(screen.getByText('计数: 0')).toBeInTheDocument();
  });

  test('点击增加按钮，计数+1', () => {
    render(<Counter />);
    fireEvent.click(screen.getByText('增加'));
    expect(screen.getByText('计数: 1')).toBeInTheDocument();
  });

  test('点击减少按钮，计数-1', () => {
    render(<Counter />);
    fireEvent.click(screen.getByText('减少'));
    expect(screen.getByText('计数: -1')).toBeInTheDocument();
  });

  test('重置按钮将计数归零', () => {
    render(<Counter />);
    fireEvent.click(screen.getByText('增加'));
    fireEvent.click(screen.getByText('增加'));
    fireEvent.click(screen.getByText('重置'));
    expect(screen.getByText('计数: 0')).toBeInTheDocument();
  });
});
```

**API服务测试 (Node.js)**
```javascript
// auth.test.js
const request = require('supertest');
const app = require('../app');

describe('认证API', () => {
  test('POST /api/login 成功登录', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'password123' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  test('POST /api/login 无效密码返回401', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'wrongpassword' });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('密码错误');
  });

  test('GET /api/user 未认证返回401', async () => {
    const response = await request(app)
      .get('/api/user');
    
    expect(response.status).toBe(401);
  });
});
```

### 3.2 E2E测试 (Playwright)

#### 测试场景
- 用户登录流程
- 表单提交验证
- 导航和页面跳转
- 响应式设计测试

#### 测试用例示例

**登录流程测试**
```javascript
// login.spec.js
const { test, expect } = require('@playwright/test');

test.describe('用户登录', () => {
  test('成功登录并跳转到首页', async ({ page }) => {
    await page.goto('/login');
    
    // 填写登录表单
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 验证跳转到首页
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('欢迎');
  });

  test('无效凭证显示错误信息', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="username"]', 'invalid');
    await page.fill('[data-testid="password"]', 'invalid');
    await page.click('[data-testid="login-button"]');
    
    // 验证错误信息显示
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('用户名或密码错误');
  });

  test('表单验证 - 必填字段', async ({ page }) => {
    await page.goto('/login');
    
    // 不填写任何内容直接提交
    await page.click('[data-testid="login-button"]');
    
    // 验证验证错误
    await expect(page.locator('[data-testid="username-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });
});

test.describe('响应式设计', () => {
  test('移动端登录页面布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.goto('/login');
    
    // 验证移动端特定元素
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();
  });
});
```

### 3.3 覆盖率策略

#### 覆盖率目标
- **语句覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 70%
- **函数覆盖率**: ≥ 85%
- **行覆盖率**: ≥ 80%

#### Jest配置
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 85,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/__tests__/**/*.test.{js,jsx}']
};
```

#### Vitest配置
```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
});
```

## 4. 测试目录结构

```
项目根目录/
├── src/
│   ├── components/
│   │   ├── Counter.jsx
│   │   └── Counter.test.jsx
│   ├── services/
│   │   ├── auth.js
│   │   └── auth.test.js
│   └── utils/
│       ├── helpers.js
│       └── helpers.test.js
├── e2e/
│   ├── login.spec.js
│   ├── dashboard.spec.js
│   └── playwright.config.js
├── __tests__/
│   ├── integration/
│   │   └── auth-flow.test.js
│   └── unit/
│       └── components.test.js
├── jest.config.js
├── vitest.config.ts
└── playwright.config.js
```

## 5. 测试运行脚本

### package.json scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e",
    "vitest": "vitest",
    "vitest:coverage": "vitest --coverage"
  }
}
```

## 6. CI/CD集成

### GitHub Actions示例
```yaml
name: 测试流水线
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 运行单元测试
        run: npm run test:coverage
      
      - name: 运行E2E测试
        run: npx playwright install --with-deps && npm run test:e2e
      
      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## 7. 测试最佳实践

1. **测试命名**: 使用描述性的测试名称，说明测试场景和预期结果
2. **测试数据**: 使用工厂函数或fixtures创建测试数据
3. **Mock策略**: 只mock必要的外部依赖，不mock被测试的代码
4. **断言清晰**: 每个测试只测试一个行为
5. **测试隔离**: 测试之间不共享状态
6. **快速反馈**: 保持测试快速运行

## 8. 测试监控与报告

- **覆盖率报告**: HTML格式，可在浏览器中查看
- **测试结果**: JUnit XML格式，可集成到CI/CD
- **失败截图**: Playwright自动截图失败测试
- **视频录制**: 可选录制E2E测试视频

## 9. 测试维护

1. **定期重构**: 重构测试代码，保持可维护性
2. **删除无用测试**: 删除不再相关的测试用例
3. **更新测试**: 代码变更时同步更新测试
4. **性能监控**: 监控测试运行时间，优化慢测试

## 10. 工具推荐

- **测试框架**: Jest, Vitest, Mocha
- **断言库**: Jest内置, Chai, expect
- **Mock库**: Jest内置, sinon, msw (API mocking)
- **E2E测试**: Playwright, Cypress
- **覆盖率**: Istanbul, c8
- **测试UI**: Playwright UI, Jest --watchAll
