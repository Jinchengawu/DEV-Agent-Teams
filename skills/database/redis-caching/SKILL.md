---
name: redis-caching
description: Redis 缓存和数据存储
tags: [database, redis, caching, performance]
---

# Redis 缓存技能

## 触发条件

- 实现缓存层
- 会话存储
- 消息队列
- 实时数据

## 安装配置

```bash
# Docker
docker run -d --name redis -p 6379:6379 redis

# Python
pip install redis

# Node.js
npm install redis
```

## Python 示例

```python
import redis
import json
from functools import wraps

# 连接
r = redis.Redis(host='localhost', port=6379, db=0)

# 基础操作
r.set('key', 'value')
r.get('key')  # b'value'

r.hset('user:1', 'name', 'John')
r.hget('user:1', 'name')  # b'John'

r.lpush('queue', 'task1', 'task2')
r.rpop('queue')  # b'task1'

# JSON 存储
data = {'name': 'John', 'age': 30}
r.set('user:1', json.dumps(data))
user = json.loads(r.get('user:1'))

# 缓存装饰器
def cache(ttl=300):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = f"cache:{func.__name__}:{args}:{kwargs}"
            cached = r.get(key)
            if cached:
                return json.loads(cached)
            result = func(*args, **kwargs)
            r.setex(key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

@cache(ttl=60)
def get_user(user_id):
    # 数据库查询
    return {'id': user_id, 'name': 'John'}
```

## Node.js 示例

```typescript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// 基础操作
await client.set('key', 'value');
await client.get('key');

// Hash
await client.hSet('user:1', 'name', 'John');
await client.hGet('user:1', 'name');

// List
await client.lPush('queue', 'task1', 'task2');
await client.rPop('queue');

// 发布订阅
await client.publish('channel', 'message');
client.subscribe('channel', (message) => {
  console.log(message);
});
```

## 缓存策略

### Cache-Aside
```python
def get_user(user_id):
    # 1. 检查缓存
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # 2. 查询数据库
    user = db.query(User, user_id)
    
    # 3. 写入缓存
    r.setex(cache_key, 300, json.dumps(user))
    
    return user
```

### Write-Through
```python
def update_user(user_id, data):
    # 1. 更新数据库
    db.update(User, user_id, data)
    
    # 2. 更新缓存
    cache_key = f"user:{user_id}"
    r.setex(cache_key, 300, json.dumps(data))
```

### Write-Behind
```python
def update_user(user_id, data):
    # 1. 更新缓存
    cache_key = f"user:{user_id}"
    r.setex(cache_key, 300, json.dumps(data))
    
    # 2. 异步更新数据库
    queue.enqueue(db.update, User, user_id, data)
```

## 最佳实践

### 键命名
```
user:{id}           # 用户对象
user:{id}:profile   # 用户配置
session:{id}        # 会话
cache:{function}    # 缓存数据
queue:{name}        # 队列
```

### 过期策略
```python
# 设置过期时间
r.setex('key', 3600, 'value')  # 1小时

# 随机过期（避免缓存雪崩）
import random
ttl = 300 + random.randint(0, 60)
r.setex('key', ttl, 'value')
```

### 监控
```bash
# Redis CLI
redis-cli INFO memory
redis-cli INFO stats
redis-cli MONITOR
```

---

**技能版本**：v1.0
