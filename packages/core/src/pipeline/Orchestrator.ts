/**
 * Pipeline Orchestrator（面编排器）
 *
 * 基于 DAG 的面编排引擎：
 * - 解析 Pipeline 定义（YAML）
 * - 构建面依赖图
 * - 按拓扑顺序执行（支持并行）
 * - 管理面之间的输入/输出传递
 * - 处理关卡、回滚、事件
 */

import { eventBus } from '../event/EventBus.js';
import type { TeamOrchestrator } from '../team/TeamOrchestrator.js';
import type { WorkflowStateManager } from '../session/WorkflowStateManager.js';
import { Surface, createSurface } from './Surface.js';
import type {
  PipelineDefinition,
  PipelineInstance,
  PipelineStatus,
  SurfaceDefinition,
  Edge,
  SurfaceResult,
} from './types.js';

/**
 * Pipeline 编排器
 */
export class PipelineOrchestrator {
  private pipelines: Map<string, PipelineDefinition> = new Map();
  private instances: Map<string, PipelineInstance> = new Map();
  private teamOrchestrator: TeamOrchestrator;
  private stateManager?: WorkflowStateManager;

  constructor(teamOrchestrator: TeamOrchestrator, stateManager?: WorkflowStateManager) {
    this.teamOrchestrator = teamOrchestrator;
    this.stateManager = stateManager;
  }

  /**
   * 加载 Pipeline 定义
   */
  loadPipeline(def: PipelineDefinition): void {
    this.pipelines.set(def.id, def);
    console.log(`[PipelineOrchestrator] Pipeline "${def.name}" (${def.id}) 已加载`);
  }

  /**
   * 从 YAML 文件加载（异步，需要解析器）
   */
  async loadFromYaml(_yamlPath: string): Promise<void> {
    // TODO: 实现 YAML 解析
    console.log('[PipelineOrchestrator] YAML 加载待实现');
  }

  /**
   * 执行 Pipeline
   *
   * 1. 解析 DAG 依赖
   * 2. 按拓扑顺序执行面
   * 3. 支持并行执行（无依赖的面同时运行）
   * 4. 传递输入/输出产物
   */
  async execute(pipelineId: string, initialInput?: Record<string, any>): Promise<PipelineInstance> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline "${pipelineId}" 未找到`);
    }

    const instanceId = `pipeline-${Date.now()}`;
    const instance: PipelineInstance = {
      id: instanceId,
      pipelineId,
      status: 'running',
      surfaceResults: new Map(),
      startedAt: Date.now(),
    };

    this.instances.set(instanceId, instance);

    console.log(`[PipelineOrchestrator] Pipeline "${pipeline.name}" 开始执行 (instance: ${instanceId})`);

    // 发布 Pipeline 开始事件
    eventBus.emit({
      type: 'workflow.started',
      source: 'workflow',
      timestamp: Date.now(),
      payload: {
        workflowId: instanceId,
        taskId: pipeline.name,
        pipelineId,
      },
    });

    try {
      // 构建 DAG 和执行顺序
      const dag = this.buildDAG(pipeline);
      const executionOrder = this.topologicalSort(dag);

      // 按批次执行（支持并行）
      for (const batch of executionOrder) {
        console.log(`[PipelineOrchestrator] 执行批次: ${batch.join(', ')}`);

        // 并行执行当前批次
        const batchPromises = batch.map((surfaceId) =>
          this.executeSurface(pipeline, surfaceId, instance, initialInput),
        );

        await Promise.all(batchPromises);

        // 检查是否有失败
        const hasFailure = batch.some((sid) => {
          const result = instance.surfaceResults.get(sid);
          return result?.status === 'failed';
        });

        if (hasFailure) {
          console.error(`[PipelineOrchestrator] 批次执行失败，Pipeline 终止`);
          instance.status = 'failed';
          break;
        }
      }

      if (instance.status !== 'failed') {
        instance.status = 'completed';
        instance.completedAt = Date.now();

        // 发布 Pipeline 完成事件
        eventBus.emit({
          type: 'workflow.completed',
          source: 'workflow',
          timestamp: Date.now(),
          payload: {
            workflowId: instanceId,
            taskId: pipeline.name,
            pipelineId,
            output: 'Pipeline 执行完成',
          },
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      instance.status = 'failed';
      instance.error = errorMsg;
      instance.completedAt = Date.now();

      // 发布 Pipeline 失败事件
      eventBus.emit({
        type: 'workflow.failed',
        source: 'workflow',
        timestamp: Date.now(),
        payload: {
          workflowId: instanceId,
          taskId: pipeline.name,
          pipelineId,
          error: errorMsg,
        },
      });
    }

    return instance;
  }

  /**
   * 获取 Pipeline 实例状态
   */
  getStatus(instanceId: string): PipelineInstance | null {
    return this.instances.get(instanceId) || null;
  }

  /**
   * 列出所有 Pipeline 定义
   */
  listPipelines(): PipelineDefinition[] {
    return [...this.pipelines.values()];
  }

  /**
   * 列出运行中的实例
   */
  listRunningInstances(): PipelineInstance[] {
    return [...this.instances.values()].filter((i) => i.status === 'running');
  }

  /**
   * 暂停 Pipeline（待实现）
   */
  async pause(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`实例 ${instanceId} 未找到`);
    instance.status = 'paused';
    console.log(`[PipelineOrchestrator] Pipeline ${instanceId} 已暂停`);
  }

  /**
   * 恢复 Pipeline（待实现）
   */
  async resume(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`实例 ${instanceId} 未找到`);
    instance.status = 'running';
    console.log(`[PipelineOrchestrator] Pipeline ${instanceId} 已恢复`);
  }

  /**
   * 回滚到指定面（待实现）
   */
  async rollback(instanceId: string, surfaceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`实例 ${instanceId} 未找到`);
    console.log(`[PipelineOrchestrator] Pipeline ${instanceId} 回滚到 ${surfaceId}`);
    instance.status = 'rolled_back';

    // TODO: 从缓存恢复上下文
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 构建 DAG
   */
  private buildDAG(pipeline: PipelineDefinition): Map<string, Set<string>> {
    const dag = new Map<string, Set<string>>();

    // 初始化所有面
    for (const surface of pipeline.surfaces) {
      dag.set(surface.id, new Set());
    }

    // 添加依赖边
    for (const edge of pipeline.edges) {
      const downstream = Array.isArray(edge.to) ? edge.to : [edge.to];
      for (const toId of downstream) {
        const deps = dag.get(toId) || new Set();
        deps.add(edge.from);
        dag.set(toId, deps);
      }
    }

    return dag;
  }

  /**
   * 拓扑排序（分层执行，支持并行）
   */
  private topologicalSort(dag: Map<string, Set<string>>): string[][] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, Set<string>>();

    // 初始化
    for (const [id, deps] of dag) {
      inDegree.set(id, deps.size);
      if (!adj.has(id)) adj.set(id, new Set());
      for (const dep of deps) {
        const downstream = adj.get(dep) || new Set();
        downstream.add(id);
        adj.set(dep, downstream);
      }
    }

    const batches: string[][] = [];
    const visited = new Set<string>();

    while (visited.size < dag.size) {
      const batch: string[] = [];
      for (const [id, degree] of inDegree) {
        if (degree === 0 && !visited.has(id)) {
          batch.push(id);
        }
      }

      if (batch.length === 0) {
        throw new Error('DAG 存在循环依赖');
      }

      batches.push(batch);
      for (const id of batch) {
        visited.add(id);
        for (const downstream of adj.get(id) || []) {
          inDegree.set(downstream, (inDegree.get(downstream) || 0) - 1);
        }
      }
    }

    return batches;
  }

  /**
   * 执行单个面
   */
  private async executeSurface(
    pipeline: PipelineDefinition,
    surfaceId: string,
    instance: PipelineInstance,
    initialInput?: Record<string, any>,
  ): Promise<SurfaceResult> {
    const surfaceDef = pipeline.surfaces.find((s) => s.id === surfaceId);
    if (!surfaceDef) {
      throw new Error(`面 ${surfaceId} 未定义`);
    }

    console.log(`[PipelineOrchestrator] 执行面: ${surfaceId} (${surfaceDef.name})`);
    instance.currentSurface = surfaceId;

    // 创建面实例
    const surface = createSurface(surfaceDef, this.teamOrchestrator);

    // 准备输入
    // 1. 初始输入
    if (initialInput && surfaceDef.input?.from === undefined) {
      for (const [key, value] of Object.entries(initialInput)) {
        surface.setInput(key, value);
      }
    }

    // 2. 上游面的输出
    const upstreamEdges = pipeline.edges.filter((e) => {
      const downstream = Array.isArray(e.to) ? e.to : [e.to];
      return downstream.includes(surfaceId);
    });

    for (const edge of upstreamEdges) {
      const upstreamResult = instance.surfaceResults.get(edge.from);
      if (upstreamResult?.artifacts) {
        for (const [key, value] of Object.entries(upstreamResult.artifacts)) {
          surface.setInput(`${edge.from}.${key}`, value);
        }
      }
    }

    // 3. 来自指定面的输入
    if (surfaceDef.input?.from) {
      const fromSurfaceId = surfaceDef.input.from;
      const fromResult = instance.surfaceResults.get(fromSurfaceId);
      if (fromResult?.artifacts?.output) {
        surface.setInput('from_upstream', fromResult.artifacts.output);
      }
    }

    // 执行面
    const result = await surface.execute();
    instance.surfaceResults.set(surfaceId, result);

    return result;
  }
}

/**
 * 创建 Pipeline 编排器
 */
export function createPipelineOrchestrator(
  teamOrchestrator: TeamOrchestrator,
  stateManager?: WorkflowStateManager,
): PipelineOrchestrator {
  return new PipelineOrchestrator(teamOrchestrator, stateManager);
}
