---
name: typescript-best-practices
description: TypeScript 最佳实践和类型设计
tags: [frontend, typescript, types, generics]
---

# TypeScript 最佳实践

## 类型设计

### 基础类型
```typescript
// 接口
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

// 类型别名
type ID = string | number;
type Optional<T> = T | null | undefined;
```

### 泛型
```typescript
// 泛型函数
function identity<T>(arg: T): T {
  return arg;
}

// 泛型接口
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// 泛型类
class Repository<T extends { id: number }> {
  private items: T[] = [];
  
  add(item: T): void {
    this.items.push(item);
  }
  
  findById(id: number): T | undefined {
    return this.items.find(item => item.id === id);
  }
}
```

### 条件类型
```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>;      // false
```

### 映射类型
```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};
```

## 类型守卫

```typescript
// typeof 守卫
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// in 守卫
interface Fish { swim(): void; }
interface Bird { fly(): void; }

function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim();
  } else {
    animal.fly();
  }
}

// 自定义守卫
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'number' && typeof obj.name === 'string';
}
```

## 最佳实践

### 避免 any
```typescript
// ❌ 不推荐
function process(data: any): any {
  return data;
}

// ✅ 推荐
function process<T>(data: T): T {
  return data;
}
```

### 使用类型推断
```typescript
// ❌ 不推荐
const users: User[] = [];

// ✅ 推荐
const users = [] as User[];
```

### 严格模式
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

---

**技能版本**：v1.0
