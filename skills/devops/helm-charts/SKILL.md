---
name: helm-charts
description: Helm Charts Kubernetes 包管理
tags: [devops, helm, kubernetes, packaging]
---

# Helm Charts 技能

## 触发条件

- 创建 Helm Chart
- Kubernetes 应用打包
- 版本管理
- 多环境配置

## 创建 Chart

```bash
# 创建新 Chart
helm create myapp

# 目录结构
myapp/
├── Chart.yaml          # Chart 元数据
├── values.yaml         # 默认配置
├── templates/          # 模板文件
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── _helpers.tpl
└── charts/             # 依赖 Chart
```

## Chart.yaml

```yaml
# Chart.yaml
apiVersion: v2
name: myapp
description: My application Helm chart
type: application
version: 0.1.0
appVersion: "1.0.0"
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

## values.yaml

```yaml
# values.yaml
replicaCount: 3

image:
  repository: myapp
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: ImplementationSpecific

resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 250m
    memory: 128Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

postgresql:
  enabled: true
  auth:
    postgresPassword: "password"
```

## 模板语法

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: {{ .Values.service.port }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

## 常用命令

```bash
# 安装 Chart
helm install myapp ./myapp

# 升级
helm upgrade myapp ./myapp

# 回滚
helm rollback myapp 1

# 卸载
helm uninstall myapp

# 查看状态
helm status myapp

# 模板渲染
helm template myapp ./myapp

# 验证
helm lint ./myapp
```

## 多环境配置

```bash
# 目录结构
environments/
├── dev/
│   └── values.yaml
├── staging/
│   └── values.yaml
└── prod/
    └── values.yaml

# 安装不同环境
helm install myapp-dev ./myapp -f environments/dev/values.yaml
helm install myapp-prod ./myapp -f environments/prod/values.yaml
```

## 最佳实践

### 版本管理
- 遵循语义化版本
- 使用 appVersion 跟踪应用版本
- 保持 Chart 和应用版本同步

### 配置管理
- 敏感信息使用 Secrets
- 环境差异通过 values.yaml 覆盖
- 使用模板函数避免重复

### 测试
```bash
# Helm 测试
helm test myapp

# 模板测试
helm template --debug ./myapp
```

---

**技能版本**：v1.0
