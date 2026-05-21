---
name: deno
description: Deno 现代 JavaScript/TypeScript 运行时
tags: [backend, deno, typescript, runtime]
---

# Deno 开发技能

## 触发条件

- 创建 Deno 应用
- 安全沙箱执行
- TypeScript 原生支持
- Web 标准 API

## 安装

```bash
# macOS
brew install deno

# 验证安装
deno --version
```

## 基础示例

```typescript
// main.ts
console.log("Hello from Deno!");

// 读取文件
const data = await Deno.readTextFile("./hello.txt");
console.log(data);

// 启动 HTTP 服务器
Deno.serve({ port: 8000 }, (req) => {
  return new Response("Hello World!");
});
```

## Oak 框架

```typescript
// app.ts
import { Application, Router } from "https://deno.land/x/oak@v12.6.0/mod.ts";

const app = new Application();
const router = new Router();

// 路由
router.get("/", (ctx) => {
  ctx.response.body = "Hello World!";
});

router.get("/users/:id", (ctx) => {
  const id = ctx.params.id;
  ctx.response.body = { id, name: "John" };
});

router.post("/users", async (ctx) => {
  const body = await ctx.request.body().value;
  ctx.response.body = { id: 1, ...body };
  ctx.response.status = 201;
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });
```

## 数据库

```typescript
// 使用 PostgreSQL
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const client = new Client({
  user: "user",
  database: "mydb",
  hostname: "localhost",
  port: 5432,
});

await client.connect();

const result = await client.query("SELECT * FROM users");
console.log(result.rows);

await client.end();
```

## 安全特性

```typescript
// 权限控制
// deno run --allow-net --allow-read main.ts

// 环境变量
const port = Deno.env.get("PORT") || "8000";

// 文件操作
await Deno.writeTextFile("./output.txt", "Hello");
const content = await Deno.readTextFile("./input.txt");
```

## 测试

```typescript
// test.ts
import { assertEquals } from "https://deno.land/std@0.200.0/assert/assert_equals.ts";

Deno.test("add test", () => {
  assertEquals(2 + 2, 4);
});

Deno.test("async test", async () => {
  const result = await fetch("http://localhost:8000");
  assertEquals(result.status, 200);
});
```

## 最佳实践

### 安全
- 最小权限原则
- 使用 `--allow-*` 标志
- 验证输入

### 性能
- 使用连接池
- 缓存依赖
- 使用 Web Workers

### 部署
```bash
# 编译为可执行文件
deno compile main.ts

# Docker
FROM denoland/deno:latest
COPY . .
RUN deno cache main.ts
CMD ["deno", "run", "--allow-net", "main.ts"]
```

---

**技能版本**：v1.0
