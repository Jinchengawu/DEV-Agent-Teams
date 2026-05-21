---
name: microservices
description: 微服务架构设计和实现
tags: [backend, microservices, architecture, distributed]
---

# 微服务架构技能

## 触发条件

- 设计微服务架构
- 服务拆分
- 分布式系统
- 服务通信

## 架构模式

### API Gateway
```
Client → API Gateway → Service A
                     → Service B
                     → Service C
```

### 事件驱动
```
Service A → Event Bus → Service B
                     → Service C
```

## 服务拆分

### 按业务域拆分
```
用户服务 (User Service)
├── 用户注册
├── 用户认证
└── 用户管理

订单服务 (Order Service)
├── 创建订单
├── 订单状态
└── 订单查询

支付服务 (Payment Service)
├── 支付处理
├── 退款
└── 支付记录
```

## 服务通信

### REST API
```typescript
// 服务间调用
const response = await fetch('http://user-service/api/users/1');
const user = await response.json();
```

### gRPC
```protobuf
service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);
}
```

### 消息队列
```typescript
// 发布事件
await messageQueue.publish('user.created', { userId: 1 });

// 订阅事件
messageQueue.subscribe('user.created', async (event) => {
  await sendWelcomeEmail(event.userId);
});
```

## 服务发现

### 客户端发现
```typescript
// 从注册中心获取服务列表
const services = await registry.getServices('user-service');
const service = services[0];
```

### 服务端发现
```typescript
// 通过负载均衡器
const response = await fetch('http://user-service.internal/api/users');
```

## 数据管理

### 每个服务独立数据库
```
User Service → PostgreSQL (users_db)
Order Service → PostgreSQL (orders_db)
Payment Service → PostgreSQL (payments_db)
```

### Saga 模式
```typescript
// 分布式事务
async function createOrder(order) {
  const saga = new Saga();
  
  saga.step('CreateOrder', 
    () => orderService.create(order),
    () => orderService.cancel(order.id)
  );
  
  saga.step('ReserveInventory',
    () => inventoryService.reserve(order.items),
    () => inventoryService.release(order.items)
  );
  
  saga.step('ProcessPayment',
    () => paymentService.charge(order.total),
    () => paymentService.refund(order.total)
  );
  
  await saga.execute();
}
```

## 容错模式

### 熔断器
```typescript
class CircuitBreaker {
  private failures = 0;
  private isOpen = false;
  
  async call(fn) {
    if (this.isOpen) {
      throw new Error('Circuit is open');
    }
    
    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      if (this.failures >= 3) {
        this.isOpen = true;
        setTimeout(() => this.isOpen = false, 30000);
      }
      throw error;
    }
  }
}
```

### 重试
```typescript
async function retry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

## 最佳实践

### 设计原则
- 单一职责
- 服务自治
- 去中心化
- 容错设计

### 监控
- 分布式追踪
- 日志聚合
- 指标监控
- 告警

### 部署
- 容器化
- 编排平台
- 蓝绿部署
- 金丝雀发布

---

**技能版本**：v1.0
