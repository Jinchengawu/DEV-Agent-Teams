# 用户认证 API 设计规范

## 概述

基于 JWT (JSON Web Token) 的用户认证系统，采用双 Token 机制（Access Token + Refresh Token）确保安全性。

## Base URL

```
http://localhost:3001/api/v1
```

## 认证方式

| 类型 | 说明 | 有效期 |
|------|------|--------|
| Access Token | 用于 API 认证 | 15 分钟 |
| Refresh Token | 用于刷新 Access Token | 7 天 |

## API 端点

### 1. 用户注册

```http
POST /auth/register
```

**Request Body:**
```json
{
  "username": "string (3-20字符)",
  "email": "string (有效邮箱)",
  "password": "string (至少8位，包含大小写和数字)",
  "confirmPassword": "string (需与password一致)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "avatar": "string | null",
      "createdAt": "ISO8601"
    },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

**错误响应:**
- `400` - 参数验证失败
- `409` - 邮箱或用户名已被注册

---

### 2. 用户登录

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "rememberMe": "boolean (可选，默认false)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "avatar": "string | null",
      "role": "user | admin",
      "lastLoginAt": "ISO8601"
    },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

**错误响应:**
- `400` - 参数验证失败
- `401` - 邮箱或密码错误
- `423` - 账号被锁定（多次登录失败）

---

### 3. 用户登出

```http
POST /auth/logout
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

### 4. 刷新 Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

**错误响应:**
- `401` - Refresh Token 无效或已过期

---

### 5. 获取当前用户信息

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string | null",
    "role": "user | admin",
    "createdAt": "ISO8601",
    "lastLoginAt": "ISO8601"
  }
}
```

---

### 6. 更新用户资料

```http
PUT /auth/profile
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "username": "string (可选)",
  "avatar": "string (可选)"
}
```

---

### 7. 修改密码

```http
PUT /auth/password
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string",
  "confirmNewPassword": "string"
}
```

---

### 8. 忘记密码

```http
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "重置密码邮件已发送"
}
```

---

### 9. 重置密码

```http
POST /auth/reset-password
```

**Request Body:**
```json
{
  "token": "string (邮件中的重置token)",
  "newPassword": "string",
  "confirmNewPassword": "string"
}
```

---

## 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": []
  }
}
```

## 错误码对照表

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| VALIDATION_ERROR | 400 | 参数验证失败 |
| UNAUTHORIZED | 401 | 未认证 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| ACCOUNT_LOCKED | 423 | 账号锁定 |
| RATE_LIMITED | 429 | 请求过于频繁 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

## 安全建议

1. **HTTPS**: 生产环境必须使用 HTTPS
2. **CORS**: 配置允许的源
3. **Rate Limiting**: 登录接口限制频率（如 5次/分钟）
4. **密码加密**: 使用 bcrypt 加密存储
5. **Token 存储**: 
   - Access Token: 内存或 HttpOnly Cookie
   - Refresh Token: HttpOnly Cookie（推荐）
6. **CSRF 防护**: 使用 SameSite Cookie 或 CSRF Token
