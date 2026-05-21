---
name: nodejs-development
description: Node.js/Express 后端开发最佳实践
tags: [backend, nodejs, express, typescript]
---

# Node.js 开发技能

## 触发条件

- 创建 Express API
- 中间件开发
- 数据库集成
- WebSocket 实现

## 项目结构

```
src/
├── controllers/       # 控制器
├── middleware/        # 中间件
├── models/           # 数据模型
├── routes/           # 路由
├── services/         # 业务逻辑
├── utils/            # 工具函数
├── app.ts            # Express 应用
└── server.ts         # 服务器入口
```

## Express API

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { userRouter } from './routes/user.routes';

const app = express();

// 中间件
app.use(cors());
app.use(helmet());
app.use(express.json());

// 路由
app.use('/api/users', userRouter);

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
```

## Prisma ORM

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
```

## 最佳实践

### 环境变量
```typescript
// src/config/env.ts
import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000'),
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
};
```

### 错误处理
```typescript
// src/middleware/errorHandler.ts
export function errorHandler(err, req, res, next) {
  console.error(err.stack);
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }
  
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
}
```

---

**技能版本**：v1.0
