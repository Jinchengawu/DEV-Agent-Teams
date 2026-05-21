---
name: grpc
description: gRPC 微服务通信最佳实践
tags: [backend, grpc, protobuf, microservices]
---

# gRPC 开发技能

## 触发条件

- 微服务通信
- 高性能 RPC
- 流式传输
- 多语言互操作

## Protocol Buffers 定义

```protobuf
// proto/user.proto
syntax = "proto3";

package user;

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);
  rpc CreateUser (CreateUserRequest) returns (User);
}

message GetUserRequest {
  int32 id = 1;
}

message ListUsersRequest {
  int32 page = 1;
  int32 per_page = 2;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
  string created_at = 4;
}
```

## Go 实现

```go
// server/main.go
package main

import (
    "context"
    "log"
    "net"
    
    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
    pb "myapp/proto/user"
)

type server struct {
    pb.UnimplementedUserServiceServer
}

func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    return &pb.User{
        Id:    req.Id,
        Name:  "John",
        Email: "john@example.com",
    }, nil
}

func main() {
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }
    
    s := grpc.NewServer()
    pb.RegisterUserServiceServer(s, &server{})
    reflection.Register(s)
    
    log.Println("Server listening on port 50051")
    if err := s.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}
```

## Python 客户端

```python
# client.py
import grpc
from proto import user_pb2, user_pb2_grpc

def run():
    channel = grpc.insecure_channel('localhost:50051')
    stub = user_pb2_grpc.UserServiceStub(channel)
    
    # 获取用户
    response = stub.GetUser(user_pb2.GetUserRequest(id=1))
    print(f"User: {response.name}, {response.email}")
    
    # 流式获取用户列表
    for user in stub.ListUsers(user_pb2.ListUsersRequest(page=1, per_page=10)):
        print(f"User: {user.name}")

if __name__ == '__main__':
    run()
```

## 最佳实践

### 错误处理
```go
// 使用 gRPC 状态码
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    user, err := findUser(req.Id)
    if err != nil {
        return nil, status.Error(codes.NotFound, "user not found")
    }
    return user, nil
}
```

### 拦截器
```go
// 日志拦截器
func loggingInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    log.Printf("Method: %s", info.FullMethod)
    return handler(ctx, req)
}

s := grpc.NewServer(grpc.UnaryInterceptor(loggingInterceptor))
```

### 超时和重试
```go
// 客户端超时
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

response, err := client.GetUser(ctx, &pb.GetUserRequest{Id: 1})
```

---

**技能版本**：v1.0
