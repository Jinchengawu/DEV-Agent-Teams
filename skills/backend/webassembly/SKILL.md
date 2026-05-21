---
name: webassembly
description: WebAssembly 高性能计算
tags: [backend, webassembly, wasm, performance]
---

# WebAssembly 开发技能

## 触发条件

- 高性能计算
- 浏览器端原生性能
- 多语言编译到 WASM
- 图像/音视频处理

## Rust → WASM

```bash
# 安装工具链
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# 创建项目
cargo new --lib wasm-example
cd wasm-example

# 编译
wasm-pack build --target web
```

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => {
            let mut a: u64 = 0;
            let mut b: u64 = 1;
            for _ in 2..=n {
                let temp = b;
                b = a + b;
                a = temp;
            }
            b
        }
    }
}
```

## JavaScript 使用

```typescript
// 使用 WASM 模块
import init, { add, fibonacci } from './pkg/wasm_example.js';

async function run() {
  await init();
  
  console.log(add(1, 2)); // 3
  console.log(fibonacci(10)); // 55
}

run();
```

## C/C++ → WASM (Emscripten)

```bash
# 安装 Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

# 编译
emcc main.c -o index.html
```

```c
// main.c
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    printf("Factorial of 10: %d\n", factorial(10));
    return 0;
}
```

## AssemblyScript

```typescript
// assembly/index.ts
export function add(a: i32, b: i32): i32 {
  return a + b;
}

export function fibonacci(n: i32): i64 {
  if (n <= 0) return 0;
  if (n == 1) return 1;
  
  let a: i64 = 0;
  let b: i64 = 1;
  for (let i: i32 = 2; i <= n; i++) {
    let temp = b;
    b = a + b;
    a = temp;
  }
  return b;
}
```

```bash
# 编译
npm run asbuild
```

## 使用场景

### 图像处理
```rust
#[wasm_bindgen]
pub fn process_image(data: &mut [u8], width: u32, height: u32) {
    // 高性能图像处理
    for i in (0..data.len()).step_by(4) {
        // 灰度转换
        let gray = (data[i] as f32 * 0.299 
            + data[i + 1] as f32 * 0.587 
            + data[i + 2] as f32 * 0.114) as u8;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
}
```

### 加密计算
```rust
#[wasm_bindgen]
pub fn hash_password(password: &str) -> String {
    // 高性能哈希计算
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}
```

## 最佳实践

### 性能优化
- 最小化 WASM 大小
- 使用内存视图
- 避免频繁跨边界

### 调试
- 使用 debug 构建
- Source Map 支持
- Console 日志

### 测试
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_add() {
        assert_eq!(add(1, 2), 3);
    }
}
```

---

**技能版本**：v1.0
