---
name: argocd
description: ArgoCD GitOps 持续部署
tags: [devops, argocd, gitops, kubernetes]
---

# ArgoCD GitOps 技能

## 触发条件

- Kubernetes 持续部署
- GitOps 工作流
- 多环境管理
- 自动同步

## 安装配置

```bash
# 安装 ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 获取初始密码
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# 访问 UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

## Application 定义

```yaml
# app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  
  source:
    repoURL: https://github.com/myorg/myapp.git
    targetRevision: HEAD
    path: k8s/overlays/production
  
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## 多环境配置

```yaml
# k8s/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        ports:
        - containerPort: 80
```

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  - target:
      kind: Deployment
      name: myapp
    patch: |
      - op: replace
        path: /spec/replicas
        value: 5
```

## App of Apps

```yaml
# argocd/apps/app-of-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-of-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/argocd-apps.git
    targetRevision: HEAD
    path: apps
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## 自动同步

```yaml
# 自动同步配置
syncPolicy:
  automated:
    prune: true        # 删除不在 Git 中的资源
    selfHeal: true     # 自动修复手动更改
    allowEmpty: false  # 不允许同步空资源集
  syncOptions:
    - CreateNamespace=true
    - PruneLast=true   # 最后删除资源
  retry:
    limit: 5
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m
```

## Webhook 集成

```yaml
# GitHub Webhook 配置
{
  "action": "push",
  "branches": ["main"]
}

# ArgoCD 自动同步
```

## 最佳实践

### 仓库结构
```
myapp/
├── k8s/
│   ├── base/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── dev/
│       ├── staging/
│       └── production/
├── src/
└── Dockerfile
```

### 安全
- 使用 RBAC 限制访问
- 启用 SSO
- 审计日志

### 监控
- 使用 Prometheus 指标
- 设置告警
- 健康检查

---

**技能版本**：v1.0
