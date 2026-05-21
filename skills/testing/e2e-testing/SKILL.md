---
name: e2e-testing
description: 端到端测试最佳实践
tags: [testing, e2e, playwright, cypress]
---

# E2E 测试技能

## 触发条件

- 用户流程测试
- 跨浏览器测试
- 视觉回归测试
- 性能测试

## Playwright 示例

### 安装
```bash
npm init playwright@latest
```

### 基础测试
```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toHaveText('Welcome');
});
```

### 页面对象模式
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/login');
  }
  
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="submit"]');
  }
  
  async getErrorMessage() {
    return this.page.locator('[data-testid="error"]').textContent();
  }
}

// tests/login.spec.ts
test('user can login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await expect(page).toHaveURL('/dashboard');
});
```

### API 测试
```typescript
test('API returns user data', async ({ request }) => {
  const response = await request.get('/api/users/1');
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  expect(data).toHaveProperty('id');
  expect(data).toHaveProperty('name');
});
```

## Cypress 示例

### 基础测试
```typescript
// cypress/e2e/login.cy.ts
describe('Login', () => {
  it('should login successfully', () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="submit"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.get('h1').should('contain', 'Welcome');
  });
});
```

## 最佳实践

### 测试策略
- 关键用户流程优先
- 独立可重复
- 数据隔离
- 快速反馈

### 选择器
```typescript
// 推荐：data-testid
await page.click('[data-testid="submit"]');

// 避免：CSS 选择器
await page.click('.btn-primary');
```

### 等待策略
```typescript
// 等待元素可见
await page.waitForSelector('[data-testid="result"]');

// 等待 API 响应
await page.waitForResponse(resp => resp.url().includes('/api/'));

// 等待导航
await page.waitForURL('/dashboard');
```

## CI 集成

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test
```

---

**技能版本**：v1.0
