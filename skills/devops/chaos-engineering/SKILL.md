---
name: chaos-engineering
description: 混沌工程和故障注入
tags: [devops, chaos, resilience, testing]
---

# 混沌工程技能

## 触发条件

- 系统韧性测试
- 故障注入
- 混沌实验
- 可靠性验证

## 工具

### Chaos Mesh (Kubernetes)
```bash
# 安装
helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-testing

# 创建实验
kubectl apply -f chaos-experiment.yaml
```

### Litmus (Kubernetes)
```bash
# 安装
kubectl litmus install

# 运行实验
kubectl litmus run pod-delete --namespace=default
```

### TC (Linux)
```bash
# 网络延迟
tc qdisc add dev eth0 root netem delay 100ms

# 网络丢包
tc qdisc add dev eth0 root netem loss 10%

# 网络限速
tc qdisc add dev eth0 root tbf rate 1mbit burst 32kbit latency 400ms
```

## 实验类型

### 网络故障
```yaml
# network-delay.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay
spec:
  action: delay
  mode: all
  selector:
    labelSelectors:
      app: myapp
  delay:
    latency: "100ms"
    jitter: "10ms"
  duration: "5m"
```

### Pod 故障
```yaml
# pod-delete.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-delete
spec:
  action: pod-delete
  mode: one
  selector:
    labelSelectors:
      app: myapp
  duration: "5m"
```

### CPU 压力
```yaml
# cpu-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress
spec:
  mode: one
  selector:
    labelSelectors:
      app: myapp
  stressors:
    cpu:
      workers: 2
      load: 80
  duration: "5m"
```

### 内存压力
```yaml
# memory-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: memory-stress
spec:
  mode: one
  selector:
    labelSelectors:
      app: myapp
  stressors:
    memory:
      workers: 1
      size: "256MB"
  duration: "5m"
```

## 实验流程

### 1. 定义稳态指标
```yaml
steady_state:
  metrics:
    - name: error_rate
      threshold: 0.01  # 错误率 < 1%
    - name: latency_p99
      threshold: 500   # P99 延迟 < 500ms
```

### 2. 创建假设
```
假设：系统在单个 Pod 故障时仍能正常服务
```

### 3. 设计实验
```yaml
experiment:
  type: pod-delete
  scope: one pod
  duration: 5 minutes
  chaos_scope: production
```

### 4. 执行实验
```bash
kubectl apply -f experiment.yaml
```

### 5. 分析结果
```bash
# 查看指标
kubectl port-forward svc/prometheus 9090:9090

# 查看日志
kubectl logs -l app=myapp -f
```

## 最佳实践

### 实验设计
- 从小规模开始
- 逐步扩大范围
- 自动化实验
- 持续改进

### 安全措施
- 设置停止条件
- 监控关键指标
- 准备回滚方案
- 通知相关人员

### 测试环境
- 使用非生产环境
- 模拟生产配置
- 隔离测试流量

---

**技能版本**：v1.0
