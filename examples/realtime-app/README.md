# 实时应用示例

## WebSocket 聊天应用

### 技术栈
- 前端：React + Socket.IO Client
- 后端：Node.js + Socket.IO
- 数据库：Redis（缓存）

### 项目结构
```
realtime-chat/
├── client/                 # React 前端
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── package.json
├── server/                 # Node.js 后端
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   └── socket/
│   └── package.json
└── docker-compose.yml
```

### 后端代码

```typescript
// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Socket.IO 连接
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // 加入房间
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', socket.id);
  });
  
  // 发送消息
  socket.on('send-message', (data) => {
    io.to(data.roomId).emit('receive-message', {
      message: data.message,
      userId: socket.id,
      timestamp: new Date()
    });
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

### 前端代码

```typescript
// client/src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(url: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(url);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [url]);

  return { socket, isConnected };
}

// client/src/components/Chat.tsx
import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

export function Chat({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { socket, isConnected } = useSocket('http://localhost:3001');

  useEffect(() => {
    if (!socket) return;
    
    socket.emit('join-room', roomId);
    
    socket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    return () => {
      socket.off('receive-message');
    };
  }, [socket, roomId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    
    socket.emit('send-message', {
      roomId,
      message: input
    });
    
    setInput('');
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i}>{msg.message}</div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

### Docker Compose

```yaml
version: '3.8'

services:
  client:
    build: ./client
    ports:
      - "3000:3000"
    depends_on:
      - server
  
  server:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

---

**示例版本**：v1.0
