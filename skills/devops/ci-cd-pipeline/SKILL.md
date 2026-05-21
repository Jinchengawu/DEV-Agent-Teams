---
name: ci-cd-pipeline
description: CI/CD 流水线最佳实践
tags: [devops, cicd, github-actions, automation]
---

# CI/CD 流水线技能

## 触发条件

- 配置 GitHub Actions
- 自动化测试
- 自动化部署
- 多环境管理

## GitHub Actions

### 基础流水线
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linting
      run: npm run lint
      
    - name: Run tests
      run: npm test
      
    - name: Build
      run: npm run build
```

### 多环境部署
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to staging
      run: |
        echo "Deploying to staging..."
        # 部署脚本
      
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-staging
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to production
      run: |
        echo "Deploying to production..."
        # 部署脚本
```

### Docker 构建和推送
```yaml
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: docker build -t myapp:${{ github.sha }} .
      
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
        
    - name: Push to Docker Hub
      run: |
        docker tag myapp:${{ github.sha }} myapp:latest
        docker push myapp:${{ github.sha }}
        docker push myapp:latest
```

## GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm run lint
    - npm test

build:
  stage: build
  script:
    - docker build -t myapp:$CI_COMMIT_SHA .
    - docker push myapp:$CI_COMMIT_SHA
  only:
    - main

deploy-staging:
  stage: deploy
  script:
    - kubectl set image deployment/myapp myapp=myapp:$CI_COMMIT_SHA
  environment:
    name: staging
  only:
    - main

deploy-production:
  stage: deploy
  script:
    - kubectl set image deployment/myapp myapp=myapp:$CI_COMMIT_SHA
  environment:
    name: production
  when: manual
  only:
    - main
```

## 最佳实践

### 安全
- 使用 Secrets 存储敏感信息
- 最小权限原则
- 代码签名
- 依赖扫描

### 性能
- 缓存依赖
- 并行执行
- 增量构建
- 测试分片

### 可靠性
- 自动回滚
- 健康检查
- 蓝绿部署
- 金丝雀发布

## 常用操作

```bash
# GitHub CLI
gh workflow run deploy.yml
gh run list
gh run view 12345

# GitLab CI
gitlab-ci-token
gitlab-runner list
```

---

**技能版本**：v1.0
