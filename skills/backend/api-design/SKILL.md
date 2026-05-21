---
name: api-design
description: RESTful API 设计最佳实践
tags: [backend, api, rest, openapi]
---

# API 设计技能

## 触发条件

- 设计 RESTful API
- 编写 API 文档
- 版本管理
- 认证授权

## RESTful 设计原则

### 资源命名
```
GET    /api/users          # 获取用户列表
GET    /api/users/:id      # 获取单个用户
POST   /api/users          # 创建用户
PUT    /api/users/:id      # 更新用户
DELETE /api/users/:id      # 删除用户
```

### 嵌套资源
```
GET    /api/users/:id/posts       # 获取用户的帖子
POST   /api/users/:id/posts       # 为用户创建帖子
GET    /api/users/:id/posts/:pid  # 获取用户的某个帖子
```

## OpenAPI 规范

```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /api/users:
    get:
      summary: 获取用户列表
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
    post:
      summary: 创建用户
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUser'
      responses:
        '201':
          description: 创建成功
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
```

## 认证授权

### JWT 认证
```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 权限控制
```typescript
// src/middleware/authorize.ts
export function authorize(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

## 最佳实践

### 状态码使用
```
200 OK              # 成功
201 Created         # 创建成功
204 No Content      # 删除成功
400 Bad Request     # 请求错误
401 Unauthorized    # 未认证
403 Forbidden       # 无权限
404 Not Found       # 未找到
500 Server Error    # 服务器错误
```

### 分页
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 错误响应
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

---

**技能版本**：v1.0
