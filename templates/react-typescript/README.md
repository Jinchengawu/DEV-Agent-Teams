# React + TypeScript 项目模板

## 快速开始

```bash
# 使用 Vite 创建
npm create vite@latest my-react-app -- --template react-ts

# 进入项目
cd my-react-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 项目结构

```
src/
├── components/         # 组件
│   ├── common/         # 通用组件
│   └── features/       # 功能组件
├── hooks/              # 自定义 Hooks
├── services/           # API 服务
├── stores/             # 状态管理
├── types/              # 类型定义
├── utils/              # 工具函数
├── App.tsx
└── main.tsx
```

## 核心文件

### App.tsx
```tsx
import { useState } from 'react';
import { UserList } from './components/features/UserList';

function App() {
  return (
    <div className="App">
      <h1>My React App</h1>
      <UserList />
    </div>
  );
}

export default App;
```

### 类型定义
```typescript
// types/user.ts
export interface User {
  id: number;
  name: string;
  email: string;
}

export type CreateUserInput = Omit<User, 'id'>;
```

### API 服务
```typescript
// services/api.ts
import { User, CreateUserInput } from '../types/user';

const API_BASE = '/api';

export const api = {
  getUsers: async (): Promise<User[]> => {
    const response = await fetch(`${API_BASE}/users`);
    return response.json();
  },
  
  createUser: async (data: CreateUserInput): Promise<User> => {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
```

## 常用依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "zustand": "^4.3.0",
    "axios": "^1.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.1.0",
    "@vitejs/plugin-react": "^3.1.0",
    "vitest": "^0.28.0"
  }
}
```

---

**模板版本**：v1.0
