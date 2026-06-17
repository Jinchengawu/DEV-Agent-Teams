/**
 * 厚胶水（ThickGlue）
 *
 * 多 Agent 协作：会议模式，评论聚合、决议生成、版本快照
 * 支持基于文档的会议
 */

import type { ProfileManager } from './lifecycle/profile-manager.js';
import type { ThinGlue } from './thin-glue.js';
import type {
  MeetingRequest,
  MeetingResponse,
  MeetingComment,
  TaskRequest,
} from './types.js';

/** 会议快照 */
export interface MeetingSnapshot {
  version: string;
  timestamp: string;
  goal: string;
  participants: string[];
  comments: MeetingComment[];
  resolution: string;
  documentId?: string;
  totalTokens: number;
  duration: number;
}

/** 基于文档的会议请求 */
export interface DocumentMeetingRequest {
  documentId: string;
  documentTitle: string;
  documentContent: string;
  agenda: string;
  agents?: string[];
  maxRounds?: number;
}

export interface ThickGlueConfig {
  /** 最大轮次，默认 3 */
  maxRounds?: number;
  /** 每轮超时（ms），默认 60000 */
  roundTimeout?: number;
}

export class ThickGlue {
  private profileManager: ProfileManager;
  private thinGlue: ThinGlue;
  private config: {
    maxRounds: number;
    roundTimeout: number;
  };
  private snapshots: MeetingSnapshot[] = [];
  private versionCounter = new Map<string, number>();

  constructor(
    profileManager: ProfileManager,
    thinGlue: ThinGlue,
    config?: ThickGlueConfig
  ) {
    this.profileManager = profileManager;
    this.thinGlue = thinGlue;
    this.config = {
      maxRounds: config?.maxRounds ?? 3,
      roundTimeout: config?.roundTimeout ?? 60_000,
    };
  }

  /** 执行会议 */
  async runMeeting(request: MeetingRequest): Promise<MeetingResponse> {
    const startTime = Date.now();
    const agents = request.agents ?? this.getDefaultAgents();
    const maxRounds = request.maxRounds ?? this.config.maxRounds;

    const comments: MeetingComment[] = [];
    let discussionContext = '';

    for (let round = 1; round <= maxRounds; round++) {
      console.log(`[ThickGlue] Meeting round ${round}/${maxRounds}`);

      // 并行收集所有 Agent 的评论
      const roundComments = await this.collectComments(
        agents,
        request.goal,
        discussionContext,
        round
      );

      comments.push(...roundComments);

      // 更新讨论上下文
      discussionContext = this.buildDiscussionContext(request.goal, comments);

      // 检查是否达成共识（简单实现：所有 Agent 都同意）
      if (this.checkConsensus(roundComments)) {
        console.log(`[ThickGlue] Consensus reached at round ${round}`);
        break;
      }
    }

    // 生成决议
    const resolution = await this.generateResolution(request.goal, comments);

    // 生成版本快照
    const version = this.generateVersion(request.goal);
    const snapshot: MeetingSnapshot = {
      version,
      timestamp: new Date().toISOString(),
      goal: request.goal,
      participants: agents,
      comments,
      resolution,
      totalTokens: comments.reduce((sum, c) => sum + c.tokens, 0),
      duration: Date.now() - startTime,
    };
    this.snapshots.push(snapshot);

    return {
      goal: request.goal,
      comments,
      resolution,
      totalTokens: snapshot.totalTokens,
      duration: snapshot.duration,
    };
  }

  /** 基于文档的会议 */
  async runDocumentMeeting(request: DocumentMeetingRequest): Promise<MeetingResponse> {
    const context = `## 讨论文档

**标题**: ${request.documentTitle}

**内容**:
${request.documentContent}

**议题**: ${request.agenda}

请针对以上文档和议题发表你的专业观点。`;

    return this.runMeeting({
      goal: request.agenda,
      agents: request.agents,
      maxRounds: request.maxRounds,
    });
  }

  /** 获取会议快照 */
  getSnapshots(goal?: string): MeetingSnapshot[] {
    if (goal) {
      return this.snapshots.filter(s => s.goal === goal);
    }
    return [...this.snapshots];
  }

  /** 获取最新快照 */
  getLatestSnapshot(goal: string): MeetingSnapshot | null {
    const snapshots = this.getSnapshots(goal);
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }

  /** 生成版本号 */
  private generateVersion(goal: string): string {
    const current = this.versionCounter.get(goal) ?? 0;
    const next = current + 1;
    this.versionCounter.set(goal, next);
    return `v${next}.0`;
  }

  /** 收集一轮评论 */
  private async collectComments(
    agents: string[],
    goal: string,
    context: string,
    round: number
  ): Promise<MeetingComment[]> {
    const promises = agents.map(agentId => {
      const request: TaskRequest = {
        agentId,
        task: this.buildRoundPrompt(goal, context, round),
        context: context || undefined,
      };

      return this.thinGlue.executeTask(request).then(response => ({
        agentId,
        round,
        content: response.output,
        tokens: response.tokens,
      })).catch(error => ({
        agentId,
        round,
        content: `[Error: ${error instanceof Error ? error.message : String(error)}]`,
        tokens: 0,
      }));
    });

    return Promise.all(promises);
  }

  /** 构建轮次提示词 */
  private buildRoundPrompt(goal: string, context: string, round: number): string {
    if (round === 1) {
      return `会议主题：${goal}\n\n请发表你的专业意见。`;
    }
    return `会议主题：${goal}\n\n已有讨论：\n${context}\n\n请基于以上讨论，补充你的观点或表示同意。`;
  }

  /** 构建讨论上下文 */
  private buildDiscussionContext(goal: string, comments: MeetingComment[]): string {
    return comments
      .map(c => `[${c.agentId} - 第${c.round}轮]: ${c.content}`)
      .join('\n\n');
  }

  /** 检查共识（简单实现） */
  private checkConsensus(comments: MeetingComment[]): boolean {
    const agreementKeywords = ['同意', '赞同', '没有异议', 'agree', 'approved'];
    return comments.every(c =>
      agreementKeywords.some(kw => c.content.toLowerCase().includes(kw))
    );
  }

  /** 生成决议 */
  private async generateResolution(goal: string, comments: MeetingComment[]): Promise<string> {
    const summaryPrompt = `基于以下会议讨论，生成简洁的决议摘要：

会议主题：${goal}

讨论内容：
${comments.map(c => `[${c.agentId}]: ${c.content}`).join('\n')}

请输出 3-5 条决议要点。`;

    // 使用第一个可用 Agent 生成决议
    const agents = this.profileManager.getRunningProfiles();
    if (agents.length === 0) {
      return comments.map(c => c.content).join('\n---\n');
    }

    try {
      const response = await this.thinGlue.executeTask({
        agentId: agents[0].agentId,
        task: summaryPrompt,
      });
      return response.output;
    } catch {
      // fallback: 直接拼接
      return comments.map(c => c.content).join('\n---\n');
    }
  }

  /** 获取默认参与 Agent */
  private getDefaultAgents(): string[] {
    return this.profileManager
      .getRunningProfiles()
      .map(p => p.agentId);
  }
}
