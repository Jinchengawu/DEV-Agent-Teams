/**
 * 薄胶水（ThinGlue）
 *
 * 单 Agent 任务透传：将任务路由到 Hermes Profile，返回结果。
 * Profile 不可用时降级到 TS Agent（fallback）。
 */

import type { ProfileManager } from './lifecycle/profile-manager.js';
import type { TaskRequest, TaskResponse, ProfileConfig } from './types.js';

export interface ThinGlueConfig {
  /** 请求超时（ms），默认 30000 */
  requestTimeout?: number;
  /** 是否启用 fallback，默认 true */
  enableFallback?: boolean;
}

export class ThinGlue {
  private profileManager: ProfileManager;
  private config: {
    requestTimeout: number;
    enableFallback: boolean;
  };
  private fallbackHandler?: (request: TaskRequest) => Promise<TaskResponse>;

  constructor(profileManager: ProfileManager, config?: ThinGlueConfig) {
    this.profileManager = profileManager;
    this.config = {
      requestTimeout: config?.requestTimeout ?? 30_000,
      enableFallback: config?.enableFallback ?? true,
    };
  }

  /** 设置 fallback 处理器（通常是 TS Agent） */
  setFallbackHandler(handler: (request: TaskRequest) => Promise<TaskResponse>): void {
    this.fallbackHandler = handler;
  }

  /** 执行任务 */
  async executeTask(request: TaskRequest): Promise<TaskResponse> {
    const startTime = Date.now();
    const profile = this.profileManager.getProfile(request.agentId);

    // Profile 存在且运行中 → 转发到 Profile
    if (profile && profile.status === 'running') {
      try {
        const response = await this.callProfile(profile, request);
        return {
          ...response,
          duration: Date.now() - startTime,
          source: 'profile',
        };
      } catch (error) {
        console.warn(`[ThinGlue] Profile call failed for ${request.agentId}:`, error);
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
