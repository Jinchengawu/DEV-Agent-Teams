---
name: playwright
description: Playwright E2E 测试最佳实践
tags: [testing, playwright, e2e, browser]
---

# Playwright E2E 测试技能

## 触发条件

- 浏览器自动化测试
- 跨浏览器测试
- 视觉回归测试
- API 测试

## 安装配置

```bash
# 安装
npm init playwright@latest

# 配置文件
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
```

## 基础测试

```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My App/);
});

test('can click link', async ({ page }) => {
  await page.goto('/');
  await page.click('text=About');
  await expect(page).toHaveURL('/about');
});
```

## 页面对象模式

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email"]');
    this.passwordInput = page.locator('[data-testid="password"]');
    this.submitButton = page.locator('[data-testid="submit"]');
    this.errorMessage = page.locator('[data-testid="error"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('user can login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await expect(page).toHaveURL('/dashboard');
});
```

## API 测试

```typescript
test('API returns users', async ({ request }) => {
  const response = await request.get('/api/users');
  expect(response.ok()).toBeTruthy();
  
  const users = await response.json();
  expect(Array.isArray(users)).toBeTruthy();
});

test('API creates user', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: {
      name: 'John',
      email: 'john@example.com',
    },
  });
  
  expect(response.status()).toBe(201);
  const user = await response.json();
  expect(user.name).toBe('John');
});
```

## 视觉回归测试

```typescript
test('homepage screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});

test('component screenshot', async ({ page }) => {
  await page.goto('/');
  const component = page.locator('[data-testid="hero"]');
  await expect(component).toHaveScreenshot('hero.png');
```

## 最佳实践

### 选择器优先级
```typescript
// 1. 测试 ID（推荐）
page.locator('[data-testid="submit"]')

// 2. 文本
page.locator('button:has-text("Submit")')

// 3. 角色
page.getByRole('button', { name: 'Submit' })

// 避免：CSS 选择器
page.locator('.btn-primary')
```

### 等待策略
```typescript
// 等待元素
await page.waitForSelector('[data-testid="result"]');

// 等待导航
await page.waitForURL('/dashboard');

// 等待网络空闲
await page.waitForLoadState('networkidle');
```

### 测试数据
```typescript
// 使用 fixture
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// 清理测试数据
test.afterEach(async ({ request }) => {
  await request.delete('/api/test-data');
});
```

---

**技能版本**：v1.0
