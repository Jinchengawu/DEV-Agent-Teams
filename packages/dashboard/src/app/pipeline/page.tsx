'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface PipelineDef {
  id: string;
  name: string;
  version?: string;
  surfaces: SurfaceDef[];
  edges: EdgeDef[];
}

interface SurfaceDef {
  id: string;
  name: string;
  agent: string;
  status?: string;
  input?: { required?: string[]; from?: string };
  output?: { artifacts?: string[]; description?: string };
}

interface EdgeDef {
  from: string;
  to: string | string[];
  description?: string;
}

interface SurfaceResult {
  surfaceId: string;
  status: string;
  artifacts?: Record<string, any>;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

interface PipelineInstance {
  id: string;
  pipelineId: string;
  status: string;
  surfaceResults: Record<string, SurfaceResult>;
  startedAt: number;
  completedAt?: number;
  coordination?: {
    projectId: string;
    taskIdsBySurface: Record<string, string>;
    documentIdsBySurface: Record<string, string>;
  };
}

interface CoordinationTask {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

interface CoordinationDocument {
  id: string;
  title: string;
  type: string;
}

interface CoordinationBinding {
  surfaceId: string;
  taskId: string;
  task?: CoordinationTask | null;
  documentId?: string;
  documents?: CoordinationDocument[];
}

interface CoordinationSummary {
  project?: {
    id: string;
    name: string;
  } | null;
  tasks: CoordinationTask[];
  bindings: CoordinationBinding[];
}

const STORAGE_KEY = 'pipeline-execution-history';
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export default function PipelinePage() {
  const { showToast } = useToast();
  const [pipelines, setPipelines] = useState<PipelineDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [currentInstance, setCurrentInstance] = useState<PipelineInstance | null>(null);
  const [instanceHistory, setInstanceHistory] = useState<PipelineInstance[]>([]);
  const [coordinationSummary, setCoordinationSummary] = useState<CoordinationSummary | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // 加载 Pipeline 列表 + 恢复历史
  useEffect(() => {
    fetchPipelines();
    restoreHistory();
  }, []);

  useEffect(() => {
    if (currentInstance?.id) {
      fetchCoordinationSummary(currentInstance.id);
    } else {
      setCoordinationSummary(null);
    }
  }, [currentInstance?.id]);

  // 从 localStorage 恢复历史
  const restoreHistory = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const instanceIds: string[] = JSON.parse(stored);
        // 去重并过滤空值
        const uniqueIds = Array.from(new Set(instanceIds)).filter(Boolean);
        if (uniqueIds.length > 0) {
          // 批量获取实例状态
          const res = await fetch('/api/pipeline-instances');
          if (res.ok) {
            const data = await res.json();
            const instances = data.instances || [];
            // 只保留存储的实例ID对应的实例
            const storedInstances = instances.filter((i: PipelineInstance) => uniqueIds.includes(i.id));
            setInstanceHistory(storedInstances);
            // 如果有正在运行的实例，继续轮询
            const runningInstance = storedInstances.find((i: PipelineInstance) => i.status === 'running');
            if (runningInstance) {
              startPolling(runningInstance.id);
            }
          }
        }
      }
    } catch (e) {
      console.error('恢复历史失败:', e);
    }
  };

  // 保存实例ID到 localStorage
  const saveInstanceId = (instanceId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const ids: string[] = stored ? JSON.parse(stored) : [];
      if (!ids.includes(instanceId)) {
        ids.push(instanceId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      }
    } catch (e) {
      console.error('保存历史失败:', e);
    }
  };

  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/pipelines');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPipelines(data.pipelines || []);
    } catch (e) {
      showToast('Failed to load pipelines', 'error');
    }
  };

  const fetchCoordinationSummary = async (instanceId: string) => {
    try {
      const res = await fetch(`/api/pipeline-instances/${instanceId}/coordination`);
      if (!res.ok) {
        setCoordinationSummary(null);
        return;
      }
      const data = await res.json();
      setCoordinationSummary(data);
    } catch {
      setCoordinationSummary(null);
    }
  };

  // 执行 Pipeline
  const executePipeline = async (pipelineId: string) => {
    setExecuting(pipelineId);
    try {
      const res = await fetch('/api/pipelines/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId,
          initialInput: {
            userRequest: `Dashboard requested execution of ${pipelineId}. Produce concise coordination artifacts and preserve results as documents.`,
            requestedBy: 'dashboard',
          },
          options: {
            dryRun: true,
            surfaceTimeoutMs: 90_000,
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.instanceId) {
        const instance: PipelineInstance = {
          id: data.instanceId,
          pipelineId,
          status: data.status,
          surfaceResults: data.surfaceResults || {},
          startedAt: data.startedAt,
          completedAt: data.completedAt,
        };
        setCurrentInstance(instance);
        setInstanceHistory(prev => [instance, ...prev.filter(i => i.id !== instance.id)].slice(0, 50));
        saveInstanceId(data.instanceId);
        if (data.status === 'running') {
          startPolling(data.instanceId);
        }
      }

      showToast('Pipeline started', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showToast(msg, 'error');
    } finally {
      setExecuting(null);
    }
  };

  // 轮询实例状态
  const startPolling = useCallback((instanceId: string) => {
    if (pollInterval) clearInterval(pollInterval);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline-instances/${instanceId}`);
        if (!res.ok) return;
        const data = await res.json();
        setCurrentInstance(data);

        // 更新历史中的该实例
        setInstanceHistory(prev => {
          const filtered = prev.filter(i => i.id !== data.id);
          return [data, ...filtered].slice(0, 50); // 保留最近50个
        });

        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(interval);
          setPollInterval(null);
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);

    setPollInterval(interval);
  }, [pollInterval]);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-amber-500';
      case 'pending': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">完成</Badge>;
      case 'running': return <Badge className="bg-blue-500">执行中</Badge>;
      case 'failed': return <Badge className="bg-red-500">失败</Badge>;
      case 'cancelled': return <Badge className="bg-amber-500">已取消</Badge>;
      case 'pending': return <Badge variant="secondary">等待</Badge>;
      case 'todo': return <Badge variant="secondary">待办</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500">进行中</Badge>;
      case 'review': return <Badge className="bg-purple-500">评审中</Badge>;
      case 'done': return <Badge className="bg-green-500">已完成</Badge>;
      case 'blocked': return <Badge className="bg-red-500">阻塞</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const cancelPipeline = async (instanceId: string) => {
    try {
      const res = await fetch(`/api/pipeline-instances/${instanceId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled from Dashboard' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Cancel failed');

      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      setCurrentInstance(data);
      setInstanceHistory(prev => [data, ...prev.filter(i => i.id !== data.id)].slice(0, 50));
      showToast('Pipeline cancelled', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showToast(msg, 'error');
    }
  };

  // 构建 DAG 拓扑排序（前端版本）
  const buildExecutionBatches = (pipeline: PipelineDef): string[][] => {
    const dag = new Map<string, Set<string>>();
    for (const s of pipeline.surfaces) dag.set(s.id, new Set());
    for (const edge of pipeline.edges) {
      if ((edge as any).loop) continue; // 循环边不加入 DAG
      const downstream = Array.isArray(edge.to) ? edge.to : [edge.to];
      for (const toId of downstream) {
        const deps = dag.get(toId) || new Set();
        deps.add(edge.from);
        dag.set(toId, deps);
      }
    }
    const inDegree = new Map<string, number>();
    const adj = new Map<string, Set<string>>();
    dag.forEach((deps, id) => {
      inDegree.set(id, deps.size);
      if (!adj.has(id)) adj.set(id, new Set());
      deps.forEach((dep) => {
        const d = adj.get(dep) || new Set();
        d.add(id);
        adj.set(dep, d);
      });
    });
    const batches: string[][] = [];
    const visited = new Set<string>();
    while (visited.size < dag.size) {
      const batch: string[] = [];
      inDegree.forEach((degree, id) => {
        if (degree === 0 && !visited.has(id)) batch.push(id);
      });
      if (batch.length === 0) break;
      batches.push(batch);
      batch.forEach((id) => {
        visited.add(id);
        (adj.get(id) || new Set()).forEach((downstream) => {
          inDegree.set(downstream, (inDegree.get(downstream) || 0) - 1);
        });
      });
    }
    return batches;
  };

  // 获取循环边
  const getLoopEdges = (pipeline: PipelineDef): { from: string; to: string }[] => {
    return pipeline.edges
      .filter((e) => (e as any).loop)
      .flatMap((e) => {
        const downstream = Array.isArray(e.to) ? e.to : [e.to];
        return downstream.map((toId) => ({ from: e.from, to: toId }));
      });
  };

  // 渲染 DAG 执行状态
  const renderPipelineDAG = (pipeline: PipelineDef, instance: PipelineInstance | null) => {
    const batches = buildExecutionBatches(pipeline);
    const loopEdges = getLoopEdges(pipeline);
    const surfaceMap = new Map(pipeline.surfaces.map((s) => [s.id, s]));

    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-gray-700">DAG 执行流程:</span>
          {instance && (
            <span className="text-xs text-gray-500">
              实例: {instance.id} | {getStatusBadge(instance.status)}
            </span>
          )}
          {loopEdges.length > 0 && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              {loopEdges.length} 条循环边
            </Badge>
          )}
        </div>

        {/* DAG 可视化 */}
        <div className="flex flex-col gap-8">
          {batches.map((batch, batchIndex) => (
            <div key={batchIndex} className="relative">
              {/* 批次之间的连接线 */}
              {batchIndex > 0 && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gray-300" />
              )}

              <div className={`grid gap-4 ${
                batch.length === 1 ? 'grid-cols-1' :
                batch.length === 2 ? 'grid-cols-2' :
                batch.length === 3 ? 'grid-cols-3' :
                'grid-cols-2 md:grid-cols-3'
              }`}>
                {batch.map((surfaceId) => {
                  const surface = surfaceMap.get(surfaceId);
                  if (!surface) return null;
                  const isCurrent = instance?.surfaceResults[surfaceId];
                  const status = isCurrent?.status || 'pending';
                  const taskId = instance?.coordination?.taskIdsBySurface?.[surfaceId];
                  const documentId = instance?.coordination?.documentIdsBySurface?.[surfaceId];
                  const isLoopSource = loopEdges.some((e) => e.from === surfaceId);
                  const isLoopTarget = loopEdges.some((e) => e.to === surfaceId);

                  return (
                    <div key={surfaceId} className="relative">
                      {/* 循环边指示 */}
                      {(isLoopSource || isLoopTarget) && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50">
                            🔄 循环
                          </Badge>
                        </div>
                      )}

                      <div className={`p-4 rounded-lg border-2 transition-all ${
                        status === 'running' ? 'border-blue-500 bg-blue-50' :
                        status === 'completed' ? 'border-green-500 bg-green-50' :
                        status === 'failed' ? 'border-red-500 bg-red-50' :
                        status === 'cancelled' ? 'border-amber-500 bg-amber-50' :
                        'border-gray-200 bg-white'
                      }`}>
                        {/* 状态指示器和名称 */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(status)}`} />
                          <span className="font-semibold text-sm">{surface.name}</span>
                          {getStatusBadge(status)}
                        </div>

                        <div className="text-xs text-gray-500 mb-2">
                          {surface.agent}
                        </div>

                        {taskId && (
                          <div className="mb-2 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
                            任务:{' '}
                            <a
                              href={`/knowledge?projectId=${encodeURIComponent(instance?.coordination?.projectId || '')}&taskId=${encodeURIComponent(taskId)}`}
                              className="font-mono text-blue-600 hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {taskId}
                            </a>
                            {documentId && (
                              <span className="ml-2">
                                文档: <span className="font-mono">{documentId}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* 输入/输出 */}
                        <div className="text-xs text-gray-600 space-y-1">
                          {surface.input?.from && (
                            <p>← 来自 {surface.input.from}</p>
                          )}
                          {surface.output?.artifacts && (
                            <p>→ 产出: {surface.output.artifacts.join(', ')}</p>
                          )}
                        </div>

                        {/* 执行结果 */}
                        {isCurrent && (
                          <div className="mt-2 p-2 bg-white/80 rounded border text-xs">
                            {isCurrent.error ? (
                              <p className="text-red-600">❌ {isCurrent.error}</p>
                            ) : isCurrent.artifacts ? (
                              <div>
                                <p className="text-green-600">✅ 完成</p>
                                {Object.entries(isCurrent.artifacts).slice(0, 2).map(([key, value]) => (
                                  <p key={key} className="text-gray-600 truncate">
                                    {key}: {typeof value === 'string' ? value.substring(0, 60) : JSON.stringify(value).substring(0, 60)}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                            {isCurrent.startedAt && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {isCurrent.completedAt
                                  ? `${Math.round((isCurrent.completedAt - isCurrent.startedAt) / 1000)}s`
                                  : '进行中...'
                                }
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 循环边图例 */}
        {loopEdges.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-sm font-semibold text-amber-800 mb-2">循环边</h4>
            <div className="flex flex-wrap gap-2">
              {loopEdges.map((edge, i) => (
                <Badge key={i} variant="outline" className="text-xs border-dashed border-amber-400 text-amber-700">
                  {edge.from} → {edge.to} (反馈)
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染单个 Pipeline 的执行状态（保持向后兼容）
  const renderPipelineStatus = (pipeline: PipelineDef, instance: PipelineInstance | null) => {
    return renderPipelineDAG(pipeline, instance);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Pipeline 流水线</h1>
        <p className="text-gray-500 mb-8">基于"一体多面"哲学的面编排引擎</p>

        {/* 执行历史 */}
        {instanceHistory.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">执行历史 ({instanceHistory.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                  {showHistory ? '收起' : '展开'}
                </Button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent>
                <div className="space-y-2">
                  {instanceHistory.map((instance) => (
                    <div
                      key={instance.id}
                      className={`flex items-center justify-between p-3 rounded border cursor-pointer hover:bg-gray-50 ${
                        currentInstance?.id === instance.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setCurrentInstance(instance);
                        if (instance.status === 'running') {
                          startPolling(instance.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(instance.status)}`} />
                        <div>
                          <p className="font-medium text-sm">{instance.pipelineId}</p>
                          <p className="text-xs text-gray-500">{instance.id}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{getStatusBadge(instance.status)}</p>
                        <p>{new Date(instance.startedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Pipeline 列表 */}
        <div className="grid gap-6 mb-8">
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{pipeline.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">ID: {pipeline.id} | 版本: {pipeline.version || '1.0'}</p>
                  </div>
                <Button
                  onClick={() => executePipeline(pipeline.id)}
                  disabled={executing === pipeline.id}
                  className="min-w-[100px]"
                >
                  {executing === pipeline.id ? '执行中...' : '执行'}
                </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderPipelineStatus(pipeline, currentInstance)}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 当前实例状态 */}
        {currentInstance && (
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>当前执行实例</CardTitle>
                {currentInstance.status === 'running' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelPipeline(currentInstance.id)}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    停止
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">实例ID:</span>
                  <span className="ml-2 font-mono">{currentInstance.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pipeline:</span>
                  <span className="ml-2">{currentInstance.pipelineId}</span>
                </div>
                <div>
                  <span className="text-gray-500">状态:</span>
                  <span className="ml-2">{getStatusBadge(currentInstance.status)}</span>
                </div>
                <div>
                  <span className="text-gray-500">开始时间:</span>
                  <span className="ml-2">{new Date(currentInstance.startedAt).toLocaleString()}</span>
                </div>
                {currentInstance.coordination?.projectId && (
                  <div>
                    <span className="text-gray-500">协作项目:</span>
                    <a
                      href={`/knowledge?projectId=${encodeURIComponent(currentInstance.coordination.projectId)}`}
                      className="ml-2 font-mono text-blue-600 hover:underline"
                    >
                      {currentInstance.coordination.projectId}
                    </a>
                  </div>
                )}
                {currentInstance.coordination?.taskIdsBySurface && (
                  <div>
                    <span className="text-gray-500">绑定任务:</span>
                    <span className="ml-2">
                      {Object.keys(currentInstance.coordination.taskIdsBySurface).length} 个
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentInstance && coordinationSummary && (
          <Card className="mt-6 border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle>协作脉络</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-500">项目:</span>
                  <span className="ml-2 font-mono">
                    {coordinationSummary.project?.id || currentInstance.coordination?.projectId || '未绑定'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">任务:</span>
                  <span className="ml-2">{coordinationSummary.tasks?.length || 0} 个</span>
                </div>
                <div>
                  <span className="text-gray-500">文档:</span>
                  <span className="ml-2">
                    {coordinationSummary.bindings.reduce((count, binding) => count + (binding.documents?.length || 0), 0)} 篇
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                {coordinationSummary.bindings.map((binding) => (
                  <div key={binding.surfaceId} className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">{binding.surfaceId}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {binding.task?.title || binding.taskId}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {binding.task?.status && getStatusBadge(binding.task.status)}
                      <a
                        href={`/knowledge?projectId=${encodeURIComponent(coordinationSummary.project?.id || currentInstance.coordination?.projectId || '')}&taskId=${encodeURIComponent(binding.taskId)}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        文档
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {pipelines.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p>暂无 Pipeline 定义</p>
            <p className="text-sm mt-2">请在 Gateway 中加载 Pipeline YAML</p>
          </div>
        )}
      </div>
    </div>
  );
}
