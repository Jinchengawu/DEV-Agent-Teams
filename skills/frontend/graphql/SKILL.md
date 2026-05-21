---
name: graphql
description: GraphQL API 设计和开发
tags: [backend, graphql, api, apollo]
---

# GraphQL 开发技能

## 触发条件

- 创建 GraphQL API
- Schema 设计
- Resolver 实现
- 客户端查询优化

## Schema 定义

```graphql
# schema.graphql
type Query {
  users: [User!]!
  user(id: ID!): User
  posts(authorId: ID): [Post!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String
  author: User!
  createdAt: DateTime!
}

input CreateUserInput {
  name: String!
  email: String!
  password: String!
}

input UpdateUserInput {
  name: String
  email: String
}

scalar DateTime
```

## Apollo Server 实现

```typescript
// src/graphql/schema.ts
import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type Query {
    users: [User!]!
    user(id: ID!): User
  }
  
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
  }
  
  type Post {
    id: ID!
    title: String!
    author: User!
  }
`;
```

```typescript
// src/graphql/resolvers.ts
export const resolvers = {
  Query: {
    users: async () => {
      return await prisma.user.findMany();
    },
    user: async (_, { id }) => {
      return await prisma.user.findUnique({ where: { id: parseInt(id) } });
    },
  },
  
  User: {
    posts: async (parent) => {
      return await prisma.post.findMany({
        where: { authorId: parent.id }
      });
    },
  },
  
  Post: {
    author: async (parent) => {
      return await prisma.user.findUnique({
        where: { id: parent.authorId }
      });
    },
  },
};
```

## 客户端查询

```typescript
// 使用 Apollo Client
import { gql, useQuery } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
      posts {
        id
        title
      }
    }
  }
`;

function UserList() {
  const { loading, error, data } = useQuery(GET_USERS);
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return (
    <ul>
      {data.users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## 最佳实践

### Schema 设计
- 使用描述性类型名
- 避免 N+1 查询问题
- 使用 DataLoader 批处理

### 安全
- 查询深度限制
- 查询复杂度分析
- 认证和授权

### 缓存
- 使用 Apollo Cache
- 实现查询持久化
- 乐观更新

---

**技能版本**：v1.0
