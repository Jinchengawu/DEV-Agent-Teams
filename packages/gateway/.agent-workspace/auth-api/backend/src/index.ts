import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
  },
});

app.use('/api/', limiter);

// 认证路由的更严格限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 每个 IP 最多 20 个认证请求
  message: {
    success: false,
    message: '认证请求过于频繁，请稍后再试',
  },
});

// Body 解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', authLimiter, authRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
  });
});

// 错误处理
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 认证服务已启动: http://localhost:${PORT}`);
  console.log(`📝 API 文档:`);
  console.log(`   POST /api/auth/register - 用户注册`);
  console.log(`   POST /api/auth/login    - 用户登录`);
  console.log(`   POST /api/auth/refresh-token - 刷新令牌`);
  console.log(`   GET  /api/auth/me       - 获取当前用户`);
});

export default app;
