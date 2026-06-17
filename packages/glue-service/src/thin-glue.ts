/**
 * 薄胶水（ThinGlue）
 *
 * 单 Agent 任务透传：将任务路由到 Hermes Profile，返回结果。
 * Profile 不可用时降级到 TS Agent（fallback）。
 * 支持批量并行任务和指数退避重试。
 */

import type { ProfileManager } from './lifecycle/profile-manager.js';
import type { TaskRequest, TaskResponse, ProfileConfig } from './types.js';

/** 并行任务请求 */
export interface ParallelTaskRequest {
  agentId: string;
  task: string;
  context?: string;
  maxTokens?: number;
}

/** 并行任务响应 */
export interface ParallelTaskResponse {
  results: Map<string, TaskResponse>;
  failed: string[];
  totalTokens: number;
  totalDuration: number;
}

/** 重试配置 */
export interface RetryConfig {
  maxRetries: number;        // 默认 3
  initialDelayMs: number;    // 默认 1000
  maxDelayMs: number;        // 默认 30000
  backoffMultiplier: number; // 默认 2
}

export interface ThinGlueConfig {
  /** 请求超时（ms），默认 30000 */
  requestTimeout?: number;
  /** 是否启用 fallback，默认 true */
  enableFallback?: boolean;
  /** 重试配置 */
  retry?: Partial<RetryConfig>;
}

export class ThinGlue {
  private profileManager: ProfileManager;
  private config: {
    requestTimeout: number;
    enableFallback: boolean;
    retry: RetryConfig;
  };
  private fallbackHandler?: (request: TaskRequest) => Promise<TaskResponse>;

  constructor(profileManager: ProfileManager, config?: ThinGlueConfig) {
    this.profileManager = profileManager;
    this.config = {
      requestTimeout: config?.requestTimeout ?? 30_000,
      enableFallback: config?.enableFallback ?? true,
      retry: {
        maxRetries: config?.retry?.maxRetries ?? 3,
        initialDelayMs: config?.retry?.initialDelayMs ?? 1000,
        maxDelayMs: config?.retry?.maxDelayMs ?? 30_000,
        backoffMultiplier: config?.retry?.backoffMultiplier ?? 2,
      },
    };
  }

  /** 设置 fallback 处理器（通常是 TS Agent） */
  setFallbackHandler(handler: (request: TaskRequest) => Promise<TaskResponse>): void {
    this.fallbackHandler = handler;
  }

  /** 执行任务（带重试） */
  async executeTask(request: TaskRequest): Promise<TaskResponse> {
    const startTime = Date.now();
    const profile = this.profileManager.getProfile(request.agentId);

    // Profile 存在且运行中 → 转发到 Profile（带重试）
    if (profile && profile.status === 'running') {
      try {
        const response = await this.executeWithRetry(profile, request);
        return {
          ...response,
          duration: Date.now() - startTime,
          source: 'profile',
        };
      } catch (error) {
        console.warn(`[ThinGlue] Profile call failed for ${request.agentId} after retries:`, error);
        // 降级到 fallback
      }
    }

    // Profile 不可用 → fallback
    if (this.config.enableFallback && this.fallbackHandler) {
      console.log(`[ThinGlue] Using fallback for ${request.agentId}`);
      const response = await this.fallbackHandler(request);
      return {
        ...response,
        duration: Date.now() - startTime,
        source: 'fallback',
      };
    }

    throw new Error(`No available handler for agent ${request.agentId}`);
  }

  /** 批量并行任务 */
  async executeParallel(
    requests: ParallelTaskRequest[],
    options?: { maxConcurrency?: number; timeout?: number }
  ): Promise<ParallelTaskResponse> {
    const startTime = Date.now();
    const maxConcurrency = options?.maxConcurrency ?? 5;
    const timeout = options?.timeout ?? this.config.requestTimeout;

    const results = new Map<string, TaskResponse>();
    const failed: string[] = [];
    let totalTokens = 0;

    // 分批执行，控制并发
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      const promises = batch.map(async (req) => {
        try {
          const response = await this.executeTask(req);
          results.set(req.agentId, response);
          totalTokens += response.tokens;
        } catch (error) {
          failed.push(req.agentId);
          console.warn(`[ThinGlue] Parallel task failed for ${req.agentId}:`, error);
        }
      });

      await Promise.allSettled(promises);
    }

    return {
      results,
      failed,
      totalTokens,
      totalDuration: Date.now() - startTime,
    };
  }

  /** 带指数退避的重试逻辑 */
  private async executeWithRetry(
    profile: { port: number },
    request: TaskRequest
  ): Promise<TaskResponse> {
    let lastError: Error | undefined;
    let delay = this.config.retry.initialDelayMs;

    for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        return await this.callProfile(profile, request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 不可重试的错误直接抛出
        if (!this.isRetryable(error) || attempt === this.config.retry.maxRetries) {
          throw lastError;
        }

        console.log(`[ThinGlue] Retry ${attempt + 1}/${this.config.retry.maxRetries} for ${request.agentId}, delay ${delay}ms`);
        await this.sleep(delay);
        delay = Math.min(delay * this.config.retry.backoffMultiplier, this.config.retry.maxDelayMs);
      }
    }

    throw lastError;
  }

  /** 判断是否可重试 */
  private isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      // 网络错误可重试
      if (error.name === 'AbortError') return true; // 超时
      if (error.message.includes('ECONNRESET')) return true;
      if (error.message.includes('ECONNREFUSED')) return true;
      if (error.message.includes('ETIMEDOUT')) return true;
      if (error.message.includes('503')) return true;
      if (error.message.includes('429')) return true; // 限流
    }
    return false;
  }

  /** 睡眠 */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** 调用 Profile HTTP API */
  private async callProfile(profile: { port: number }, request: TaskRequest): Promise<TaskResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeout);

    try {
      const response = await fetch(`http://127.0.0.1:${profile.port}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'hermes',
          messages: [
            ...(request.context ? [{ role: 'system', content: request.context }] : []),
            { role: 'user', content: request.task },
          ],
          max_tokens: request.maxTokens ?? 4096,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Profile returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        usage?: { total_tokens: number };
      };

      return {
        agentId: request.agentId,
        output: data.choices[0]?.message?.content ?? '',
        tokens: data.usage?.total_tokens ?? 0,
        duration: 0, // 由调用方填充
        source: 'profile',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
