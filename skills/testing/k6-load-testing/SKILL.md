---
name: k6-load-testing
description: K6 负载测试和性能测试
tags: [testing, k6, load-test, performance]
---

# K6 负载测试技能

## 触发条件

- API 负载测试
- 性能基准测试
- 压力测试
- 容量规划

## 安装配置

```bash
# macOS
brew install k6

# Docker
docker pull grafana/k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## 基础测试

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // 爬坡
    { duration: '1m', target: 20 },   // 保持
    { duration: '30s', target: 0 },   // 下降
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% 请求 < 500ms
    http_req_failed: ['rate<0.01'],    // 错误率 < 1%
  },
};

export default function () {
  const res = http.get('http://localhost:8000/api/users');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

## 场景测试

```javascript
// scenario-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // 场景 1: 浏览用户
    browsing: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
    },
    // 场景 2: 购买用户
    purchasing: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 5 },
        { duration: '5m', target: 5 },
        { duration: '2m', target: 0 },
      ],
    },
  },
};

export default function () {
  const userType = __ENV.USER_TYPE || 'browsing';
  
  if (userType === 'browsing') {
    browseProducts();
  } else {
    purchaseProduct();
  }
}

function browseProducts() {
  const res = http.get('http://localhost:8000/api/products');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(2);
}

function purchaseProduct() {
  // 添加购物车
  const addRes = http.post('http://localhost:8000/api/cart', JSON.stringify({
    productId: 1,
    quantity: 1,
  }), { headers: { 'Content-Type': 'application/json' } });
  
  check(addRes, { 'added to cart': (r) => r.status === 201 });
  
  // 结账
  const checkoutRes = http.post('http://localhost:8000/api/checkout');
  check(checkoutRes, { 'checkout success': (r) => r.status === 200 });
  
  sleep(1);
}
```

## 自定义指标

```javascript
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

const customCounter = new Counter('custom_counter');
const customGauge = new Gauge('custom_gauge');
const customRate = new Rate('custom_rate');
const customTrend = new Trend('custom_trend');

export default function () {
  customCounter.add(1);
  customGauge.set(100);
  customRate.add(true);
  customTrend.add(100);
}
```

## 输出配置

```javascript
export const options = {
  // 输出到 InfluxDB
  // k6 run --out influxdb=http://localhost:8086/k6
  
  // 输出到 Prometheus
  // k6 run --out prometheus-pushgateway
  
  // 输出到 JSON 文件
  // k6 run --out json=results.json
};
```

## 运行命令

```bash
# 运行测试
k6 run load-test.js

# 带环境变量
K6_HOSTNAME=api.example.com k6 run load-test.js

# 输出到 InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 load-test.js

# 生成 HTML 报告
k6 run --out html=report.html load-test.js
```

## 最佳实践

### 测试策略
- 基线测试
- 负载测试
- 压力测试
- 浸泡测试

### 指标监控
- 响应时间 (P50, P95, P99)
- 吞吐量 (RPS)
- 错误率
- 并发用户数

### CI 集成
```yaml
# GitHub Actions
- name: Run K6 test
  uses: grafana/k6-action@v0.3.0
  with:
    filename: load-test.js
```

---

**技能版本**：v1.0
