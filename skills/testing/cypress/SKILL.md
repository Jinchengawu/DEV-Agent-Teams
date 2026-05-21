---
name: cypress
description: Cypress 端到端测试框架
tags: [testing, cypress, e2e, browser]
---

# Cypress E2E 测试技能

## 触发条件

- 浏览器自动化测试
- 组件测试
- API 测试
- 视觉回归测试

## 安装配置

```bash
# 安装
npm install cypress --save-dev

# 打开 Cypress
npx cypress open

# 配置文件
// cypress.config.ts
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
  },
});
```

## 基础测试

```typescript
// cypress/e2e/login.cy.ts
describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should login successfully', () => {
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="submit"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.get('h1').should('contain', 'Welcome');
  });

  it('should show error for invalid credentials', () => {
    cy.get('[data-testid="email"]').type('wrong@example.com');
    cy.get('[data-testid="password"]').type('wrongpassword');
    cy.get('[data-testid="submit"]').click();
    
    cy.get('[data-testid="error"]').should('contain', 'Invalid credentials');
  });
});
```

## 自定义命令

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('[data-testid="email"]').type(email);
  cy.get('[data-testid="password"]').type(password);
  cy.get('[data-testid="submit"]').click();
  cy.url().should('include', '/dashboard');
});

// 使用
cy.login('user@example.com', 'password123');
```

## API 测试

```typescript
// cypress/e2e/api.cy.ts
describe('API Tests', () => {
  it('should get users', () => {
    cy.request('GET', '/api/users').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.be.an('array');
    });
  });

  it('should create user', () => {
    cy.request('POST', '/api/users', {
      name: 'John',
      email: 'john@example.com',
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('id');
    });
  });
});
```

## 组件测试

```typescript
// cypress/component/Button.cy.tsx
import Button from '../../src/components/Button';

describe('Button', () => {
  it('renders correctly', () => {
    cy.mount(<Button>Click me</Button>);
    cy.get('button').should('contain', 'Click me');
  });

  it('calls onClick', () => {
    const onClick = cy.stub();
    cy.mount(<Button onClick={onClick}>Click me</Button>);
    cy.get('button').click();
    cy.expect(onClick).to.be.called;
  });
});
```

## 最佳实践

### 选择器
```typescript
// 推荐
cy.get('[data-testid="submit"]');
cy.get('button:has-text("Submit")');
cy.getByRole('button', { name: 'Submit' });

// 避免
cy.get('.btn-primary');
cy.get('button[type="submit"]');
```

### 等待策略
```typescript
// 等待元素
cy.get('[data-testid="result"]').should('be.visible');

// 等待 API
cy.intercept('GET', '/api/users').as('getUsers');
cy.wait('@getUsers');

// 等待网络空闲
cy.intercept('/api/**').as('api');
cy.wait('@api');
```

### 测试数据
```typescript
// 使用 fixture
cy.fixture('users.json').then((users) => {
  // 使用测试数据
});

// 清理数据
afterEach(() => {
  cy.request('DELETE', '/api/test-data');
});
```

## CI 集成

```yaml
# .github/workflows/cypress.yml
- name: Cypress run
  uses: cypress-io/github-action@v5
  with:
    build: npm run build
    start: npm start
    wait-on: 'http://localhost:3000'
```

---

**技能版本**：v1.0
