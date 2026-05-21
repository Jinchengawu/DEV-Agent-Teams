---
name: service-mesh
description: 服务网格和流量管理
tags: [devops, service-mesh, istio, traffic]
---

# 服务网格技能

## 触发条件

- 微服务通信管理
- 流量控制
- 安全策略
- 可观测性

## Istio 安装

```bash
# 安装 Istio
istioctl install --set profile=demo

# 启用自动注入
kubectl label namespace default istio-injection=enabled
```

## 流量管理

### 虚拟服务
```yaml
# virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp
  http:
  - route:
    - destination:
        host: myapp
        subset: v1
      weight: 90
    - destination:
        host: myapp
        subset: v2
      weight: 10
```

### 目标规则
```yaml
# destination-rule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
spec:
  host: myapp
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## 流量策略

### 负载均衡
```yaml
spec:
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN  # 或 LEAST_CONN, RANDOM
```

### 连接池
```yaml
spec:
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
```

### 异常检测
```yaml
spec:
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 3m
      maxEjectionPercent: 100
```

## 安全策略

### mTLS
```yaml
# peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

### 授权策略
```yaml
# authorization-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: myapp
spec:
  selector:
    matchLabels:
      app: myapp
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/myapp"]
    to:
    - operation:
        methods: ["GET", "POST"]
```

## 可观测性

### 指标
```yaml
# 启用指标收集
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 100.0
```

### 追踪
```yaml
# 配置 Jaeger
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.17/samples/addons/jaeger.yaml
```

### 日志
```yaml
# 访问日志
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

## 故障注入

### 延迟
```yaml
# fault-injection.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp
  http:
  - fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 5s
    route:
    - destination:
        host: myapp
```

### 中止
```yaml
http:
- fault:
    abort:
      percentage:
        value: 5
      httpStatus: 503
  route:
  - destination:
      host: myapp
```

## 常用命令

```bash
# 查看代理状态
istioctl proxy-status

# 查看配置
istioctl analyze

# 查看路由
kubectl get virtualservices
kubectl get destinationrules

# 查看指标
istioctl dashboard prometheus
```

---

**技能版本**：v1.0
