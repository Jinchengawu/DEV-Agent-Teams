---
name: rust-development
description: Rust 系统编程和 Web 开发
tags: [backend, rust, web, actix, axum]
---

# Rust 开发技能

## 触发条件

- 系统编程
- 高性能 Web 服务
- 命令行工具
- 并发编程

## 项目初始化

```bash
# 创建新项目
cargo new myapp
cd myapp

# 添加依赖
cargo add actix-web
cargo add tokio --features full
cargo add serde --features derive
```

## Actix Web 示例

```rust
// src/main.rs
use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct User {
    id: u32,
    name: String,
    email: String,
}

async fn get_users() -> HttpResponse {
    let users = vec![
        User { id: 1, name: "John".to_string(), email: "john@example.com".to_string() },
    ];
    HttpResponse::Ok().json(users)
}

async fn get_user(path: web::Path<u32>) -> HttpResponse {
    let id = path.into_inner();
    let user = User {
        id,
        name: "John".to_string(),
        email: "john@example.com".to_string(),
    };
    HttpResponse::Ok().json(user)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/users", web::get().to(get_users))
            .route("/users/{id}", web::get().to(get_user))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

## Axum 示例

```rust
// src/main.rs
use axum::{Router, routing::get, Json};
use serde::Serialize;

#[derive(Serialize)]
struct Message {
    message: String,
}

async fn hello() -> Json<Message> {
    Json(Message {
        message: "Hello, World!".to_string(),
    })
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(hello));
    
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## 错误处理

```rust
// 自定义错误类型
use actix_web::{HttpResponse, ResponseError};
use std::fmt;

#[derive(Debug)]
enum AppError {
    NotFound,
    InternalError,
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::NotFound => write!(f, "Not found"),
            AppError::InternalError => write!(f, "Internal error"),
        }
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::NotFound => HttpResponse::NotFound().json("Not found"),
            AppError::InternalError => HttpResponse::InternalServerError().json("Internal error"),
        }
    }
}
```

## 最佳实践

### 并发
- 使用 Tokio 运行时
- 避免阻塞操作
- 使用 async/await

### 内存安全
- 使用所有权系统
- 避免不必要的 clone
- 使用引用而非值传递

### 错误处理
- 使用 Result 类型
- 自定义错误类型
- 使用 ? 操作符

---

**技能版本**：v1.0
