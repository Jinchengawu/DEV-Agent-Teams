---
name: security-audit
description: 安全审计和漏洞扫描
tags: [security, audit, vulnerability, owasp]
---

# 安全审计技能

## 触发条件

- 安全代码审查
- 依赖漏洞扫描
- 配置安全检查
- 合规性验证

## 依赖扫描

```bash
# npm audit
npm audit
npm audit fix

# safety (Python)
pip install safety
safety check

# trivy (容器/文件系统)
trivy fs .
trivy image myapp:latest
```

## 静态分析

```bash
# Semgrep (多语言)
semgrep --config=auto .

# Bandit (Python)
bandit -r src/

# ESLint Security
npx eslint --plugin security src/
```

## 配置检查

```bash
# 检查敏感信息泄露
grep -r "password" --include="*.{js,ts,py,yaml,yml}" .
grep -r "api_key" --include="*.{js,ts,py,yaml,yml}" .
grep -r "secret" --include="*.{js,ts,py,yaml,yml}" .

# 检查 .env 文件
cat .env.example
git ls-files | grep -E "\.env$|\.env\."
```

## 安全清单

### 代码安全
- [ ] 输入验证和清理
- [ ] SQL 注入防护（参数化查询）
- [ ] XSS 防护（输出编码）
- [ ] CSRF 防护（Token）
- [ ] 认证和授权检查

### 配置安全
- [ ] 敏感信息不硬编码
- [ ] 使用环境变量
- [ ] 最小权限原则
- [ ] HTTPS 配置
- [ ] 安全头部配置

### 依赖安全
- [ ] 定期更新依赖
- [ ] 扫描已知漏洞
- [ ] 锁定版本号
- [ ] 使用 Snyk/Dependabot

## OWASP Top 10 检查

```python
# 1. 注入攻击
# ❌ 不安全
query = f"SELECT * FROM users WHERE id = {user_id}"
# ✅ 安全
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))

# 2. 身份认证
# 使用 bcrypt 哈希密码
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

# 3. 敏感数据暴露
# 加密存储
from cryptography.fernet import Fernet
key = Fernet.generate_key()
cipher = Fernet(key)
encrypted = cipher.encrypt(sensitive_data)
```

## 报告生成

```bash
# 生成安全报告
trivy fs --format json --output report.json .

# 转换为 HTML
trivy fs --format template --template "@/contrib/htmlreport.tpl" . > report.html
```

---

**技能版本**：v1.0
