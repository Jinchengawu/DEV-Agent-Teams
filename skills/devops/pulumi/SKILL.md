---
name: pulumi
description: Pulumi 现代基础设施即代码
tags: [devops, pulumi, iac, kubernetes]
---

# Pulumi IaC 技能

## 触发条件

- 使用通用编程语言定义基础设施
- Kubernetes 资源管理
- 多云部署
- 组件复用

## 安装配置

```bash
# 安装
brew install pulumi

# 初始化项目
pulumi new typescript

# 选择模板
pulumi new aws-typescript
```

## TypeScript 示例

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// 创建 S3 存储桶
const bucket = new aws.s3.Bucket("my-bucket", {
    acl: "private",
    tags: {
        Environment: "dev",
        Name: "My bucket",
    },
});

// 创建 DynamoDB 表
const table = new aws.dynamodb.Table("my-table", {
    attributes: [
        { name: "id", type: "S" },
    ],
    hashKey: "id",
    readCapacity: 5,
    writeCapacity: 5,
});

// 导出
export const bucketName = bucket.id;
export const tableName = table.name;
```

## Kubernetes 资源

```typescript
// k8s.ts
import * as k8s from "@pulumi/kubernetes";

// 部署应用
const appDeployment = new k8s.apps.v1.Deployment("my-app", {
    spec: {
        replicas: 3,
        selector: {
            matchLabels: {
                app: "my-app",
            },
        },
        template: {
            metadata: {
                labels: {
                    app: "my-app",
                },
            },
            spec: {
                containers: [{
                    name: "my-app",
                    image: "my-app:latest",
                    ports: [{ containerPort: 80 }],
                }],
            },
        },
    },
});

// 创建 Service
const appService = new k8s.core.v1.Service("my-app", {
    spec: {
        selector: {
            app: "my-app",
        },
        ports: [{
            port: 80,
            targetPort: 80,
        }],
        type: "LoadBalancer",
    },
});

// 导出
export const endpoint = appService.status.loadBalancer.ingress[0].hostname;
```

## 组件

```typescript
// component.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class MyApp extends pulumi.ComponentResource {
    public readonly bucket: aws.s3.Bucket;
    public readonly table: aws.dynamodb.Table;

    constructor(name: string, args: MyAppArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:MyApp", name, {}, opts);

        this.bucket = new aws.s3.Bucket(`${name}-bucket`, {
            acl: "private",
        }, { parent: this });

        this.table = new aws.dynamodb.Table(`${name}-table`, {
            attributes: [{ name: "id", type: "S" }],
            hashKey: "id",
            readCapacity: 5,
            writeCapacity: 5,
        }, { parent: this });

        this.registerOutputs({
            bucketName: this.bucket.id,
            tableName: this.table.name,
        });
    }
}

interface MyAppArgs {
    // 配置参数
}
```

## 常用命令

```bash
# 预览变更
pulumi preview

# 部署
pulumi up

# 销毁
pulumi destroy

# 查看状态
pulumi stack output

# 配置
pulumi config set key value
```

## 最佳实践

### 状态管理
- 使用 Pulumi Cloud 或 S3 后端
- 启用状态锁
- 定期备份状态

### 安全
- 使用 Secrets
- 最小权限 IAM
- 审计日志

### 测试
```typescript
// 测试基础设施
import * as pulumi from "@pulumi/pulumi";
import * as testing from "@pulumi/pulumi/testing";

testing.test("bucket exists", async () => {
    const bucket = await testing.getResource("aws:s3:Bucket", "my-bucket");
    expect(bucket).toBeDefined();
});
```

---

**技能版本**：v1.0
